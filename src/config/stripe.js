const stripe = require("stripe");
require("dotenv").config();

const stripeInstance = stripe(process.env.STRIPE_SECRET_KEY);

module.exports = stripeInstance;

