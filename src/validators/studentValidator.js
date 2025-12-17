/**
 * Validate student update data
 * @param {Object} data - Student update data
 * @returns {Object} - { valid: boolean, errors: Array }
 */
const validateStudentUpdate = (data) => {
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
  validateStudentUpdate,
};
