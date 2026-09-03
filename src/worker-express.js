class ResponseBuilder {
  constructor() {
    this.statusCode = 200;
    this.headers = new Headers();
    this.body = undefined;
    this.finished = false;
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  setHeader(name, value) {
    this.headers.set(name, String(value));
  }

  getHeader(name) {
    return this.headers.get(name);
  }

  json(value) {
    this.headers.set('content-type', 'application/json; charset=utf-8');
    this.body = JSON.stringify(value);
    this.finished = true;
    return this;
  }

  send(value) {
    this.body = value;
    this.finished = true;
    return this;
  }

  end(value) {
    if (value !== undefined) this.body = value;
    this.finished = true;
  }

  toResponse() {
    return new Response(this.body, { status: this.statusCode, headers: this.headers });
  }
}

function pathMatches(path, prefix) {
  return prefix === '/' || path === prefix || path.startsWith(`${prefix}/`);
}

function matchRoute(path, pattern) {
  const names = [];
  const expression = pattern.split('/').map(segment => {
    if (segment.startsWith(':')) {
      names.push(segment.slice(1));
      return '([^/]+)';
    }
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');
  const match = new RegExp(`^${expression}/?$`).exec(path);
  if (!match) return null;
  return Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])]));
}

async function runEntries(entries, req, res) {
  let index = 0;
  const next = async () => {
    if (res.finished || index >= entries.length) return;
    const entry = entries[index++];

    if (entry.type === 'router') {
      if (!pathMatches(req.path, entry.path)) return next();
      const previousPath = req.path;
      req.path = req.path.slice(entry.path.length) || '/';
      await runEntries(entry.router.entries, req, res);
      req.path = previousPath;
      return next();
    }

    if (entry.type === 'middleware') {
      if (!pathMatches(req.path, entry.path)) return next();
      let continued = false;
      let continuation;
      await entry.handler(req, res, async () => {
        continued = true;
        continuation = next();
        await continuation;
      });
      if (continued) {
        await continuation;
        return;
      }
      return;
    }

    if (entry.method !== req.method) return next();
    const params = matchRoute(req.path, entry.path);
    if (!params) return next();
    req.params = params;
    await entry.handler(req, res);
  };

  await next();
}

class Router {
  constructor() {
    this.entries = [];
  }

  use(path, handler) {
    if (typeof path === 'function' || path?.entries) {
      handler = path;
      path = '/';
    }
    this.entries.push(handler?.entries
      ? { type: 'router', path, router: handler }
      : { type: 'middleware', path, handler });
    return this;
  }

  route(method, path, handler) {
    this.entries.push({ type: 'route', method, path, handler });
    return this;
  }

  get(path, handler) { return this.route('GET', path, handler); }
  post(path, handler) { return this.route('POST', path, handler); }
  put(path, handler) { return this.route('PUT', path, handler); }
  patch(path, handler) { return this.route('PATCH', path, handler); }
  delete(path, handler) { return this.route('DELETE', path, handler); }
}

function createExpress() {
  const app = new Router();
  app.fetch = async request => {
    const url = new URL(request.url);
    const req = {
      method: request.method,
      originalUrl: `${url.pathname}${url.search}`,
      path: url.pathname,
      headers: Object.fromEntries(request.headers),
      query: Object.fromEntries(url.searchParams),
      params: {},
      body: undefined,
      rawRequest: request
    };
    const res = new ResponseBuilder();
    await runEntries(app.entries, req, res);
    if (!res.finished) return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json; charset=utf-8' }
    });
    return res.toResponse();
  };
  return app;
}

createExpress.Router = () => new Router();
createExpress.json = () => async (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      req.body = await req.rawRequest.json();
    }
  }
  await next();
};

module.exports = createExpress;