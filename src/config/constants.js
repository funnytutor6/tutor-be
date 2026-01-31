require("dotenv").config();

module.exports = {
  FRONTEND_URL: process.env.FRONTEND_URL,
  PORT: process.env.PORT || 4242,
  NODE_ENV: process.env.NODE_ENV || "development",
  CORS_ORIGINS: [
    "http://88.222.215.134:8081",
    "http://localhost:5173",
    "http://localhost:4173",
    "https://tutor-fe-nine.vercel.app",
    "https://www.funnystudylearning.com",
    process.env.FRONTEND_URL,
  ].filter(Boolean),
};
