require("dotenv").config();

module.exports = {
  secret: process.env.JWT_SECRET || process.env.STRIPE_SECRET_KEY || "your-secret-key-change-in-production",
  expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  issuer: "funny-tutor-api",
  audience: "funny-tutor-client",
};

