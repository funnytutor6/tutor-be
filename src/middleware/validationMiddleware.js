const { validationErrorResponse } = require("../utils/responseHelper");

/**
 * Validation middleware wrapper
 * @param {Function} validator - Validation function
 * @returns {Function} - Express middleware
 */
const validate = (validator) => {
  return (req, res, next) => {
    const validation = validator(req.body);

    if (!validation.valid) {
      return validationErrorResponse(res, validation.errors);
    }

    next();
  };
};

module.exports = {
  validate,
};
