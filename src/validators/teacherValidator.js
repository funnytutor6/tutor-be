/**
 * Validate teacher update data
 * @param {Object} data - Teacher update data
 * @returns {Object} - { valid: boolean, errors: Array }
 */
const validateTeacherUpdate = (data) => {
  const errors = [];

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push("Valid email is required");
  }

  if (data.name && data.name.trim().length === 0) {
    errors.push("Name cannot be empty");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateTeacherUpdate,
};
