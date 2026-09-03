# SFTS Backend (Node.js + Express + PostgreSQL)

Implements every REQ in the SRS: auth, BMI/calorie calculation, goals,
workout/diet recommendation, sleep/activity logging, reports, admin.

## 1. Local setup

```bash
cd SFTS-backend
npm install
cp .env.example .env
# edit .env: set DATABASE_URL and JWT_SECRET
```

Create the schema on your PostgreSQL DB (local, or a free Neon DB like you used for TravelBharat):

```bash
psql "$DATABASE_URL" -f schema.sql
```

Run it:

```bash
npm run dev      # nodemon, auto-restart
# or
npm start
```

Test it's up with the host and port configured for your environment: `GET /health`

## 2. Make yourself an admin (optional)

After registering a normal user through `/api/auth/register`, run:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

## 3. API summary

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/register | - | REQ-1/2 register |
| POST | /api/auth/login | - | REQ-3 login |
| POST | /api/auth/dev-reset-password | - | Local developer password reset |
| GET/PUT | /api/profile | user | REQ-4/5/6/7/11 profile + BMI |
| GET/POST | /api/goals(/active) | user | REQ-8/9/10 goal |
| GET | /api/recommendations/workout | user | REQ-13/14/15 |
| GET | /api/recommendations/diet | user | REQ-16/17/18 |
| GET/POST | /api/activity | user | REQ-19/20 |
| GET | /api/reports | user | REQ-21/22 |
| GET | /api/admin/users, /api/admin/stats | admin | REQ-23 |
| PUT | /api/admin/users/:id/deactivate | admin | REQ-24 |

All protected routes need header: `Authorization: Bearer <token>` (token from login/register response).

## 4. Deploy

1. Push this folder to a GitHub repo.
2. Create or use an internet-accessible PostgreSQL database and run `schema.sql` once without dropping existing data.
3. In Render, choose **New → Blueprint** and select the repository. `render.yaml` configures the existing backend with `npm install`, `npm start`, and `/health` checks.
4. Enter the existing `DATABASE_URL` and `JWT_SECRET` as Render secret values. Set `CORS_ORIGINS` to the actual HTTPS web origin(s), or leave it blank for native Android-only traffic.
5. Confirm `NODE_ENV=production`, `DEV_RESET_ENABLED=false`, and `JWT_EXPIRES_IN=7d` in Render.
6. After Render provides the service's actual HTTPS URL, use it for the Android release build property.

Render supplies `PORT`; the service still binds to `0.0.0.0`. Do not put database credentials or JWT secrets in `render.yaml`.

