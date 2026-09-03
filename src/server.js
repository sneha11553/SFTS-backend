require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5050;

if (process.env.NODE_ENV === 'production') {
  for (const variable of ['DATABASE_URL', 'JWT_SECRET']) {
    if (!process.env[variable]) {
      throw new Error(`${variable} must be set in production`);
    }
  }
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SFTS API listening on port ${PORT}`);
});
