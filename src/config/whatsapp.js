/**
 * WhatsApp Business API Configuration
 * Using Facebook's WhatsApp Cloud API
 */

const whatsappConfig = {
  // API version (e.g., v18.0, v19.0)
  apiVersion: process.env.WHATSAPP_API_VERSION || "v18.0",

  // Phone Number ID from WhatsApp Business Account
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,

  // Access Token from Facebook App
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN,

  // Business Account ID (optional, for analytics)
  businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,

  // Verify token for webhook (if using webhooks)
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN,

  // Check if WhatsApp is configured
  isConfigured: function () {
    return !!(this.phoneNumberId && this.accessToken);
  },

  // Get base URL for API calls
  getBaseUrl: function () {
    return `https://graph.facebook.com/${this.apiVersion}`;
  },

  // Get messages endpoint
  getMessagesEndpoint: function () {
    return `${this.getBaseUrl()}/${this.phoneNumberId}/messages`;
  },
};

module.exports = whatsappConfig;

