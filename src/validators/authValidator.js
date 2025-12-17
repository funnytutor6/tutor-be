/**
 * Validate teacher registration data
 * @param {Object} data - Registration data
 * @returns {Object} - { valid: boolean, errors: Array }
 */
const validateTeacherRegistration = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push("Name is required");
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Valid email is required");
  }

  if (!data.password || data.password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate student registration data
 * @param {Object} data - Registration data
 * @returns {Object} - { valid: boolean, errors: Array }
 */
const validateStudentRegistration = (data) => {
  const errors = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push("Name is required");
  }

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Valid email is required");
  }

  if (!data.password || data.password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }

  if (!data.phoneNumber || data.phoneNumber.trim().length === 0) {
    errors.push("Phone number is required for verification");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate login data
 * @param {Object} data - Login data
 * @returns {Object} - { valid: boolean, errors: Array }
 */
const validateLogin = (data) => {
  const errors = [];

  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Valid email is required");
  }

  if (!data.password || data.password.length === 0) {
    errors.push("Password is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateTeacherRegistration,
  validateStudentRegistration,
  validateLogin,
};
