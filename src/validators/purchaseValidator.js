/**
 * Validate connection request data
 * @param {Object} data - Connection request data
 * @returns {Object} - { valid: boolean, errors: Array }
 */
const validateConnectionRequest = (data) => {
  const errors = [];

  if (!data.studentId || data.studentId.trim().length === 0) {
    errors.push("Student ID is required");
  }

  if (!data.teacherId || data.teacherId.trim().length === 0) {
    errors.push("Tutor ID is required");
  }

  if (!data.postId || data.postId.trim().length === 0) {
    errors.push("Post ID is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate teacher purchase checkout session data
 * @param {Object} data - Purchase data
 * @returns {Object} - { valid: boolean, errors: Array }
 */
const validateTeacherPurchase = (data) => {
  const errors = [];

  if (!data.studentPostId || data.studentPostId.trim().length === 0) {
    errors.push("Student Post ID is required");
  }

  if (!data.teacherId || data.teacherId.trim().length === 0) {
    errors.push("Tutor ID is required");
  }

  if (!data.studentId || data.studentId.trim().length === 0) {
    errors.push("Student ID is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Validate contact purchase checkout session data
 * @param {Object} data - Purchase data
 * @returns {Object} - { valid: boolean, errors: Array }
 */
const validateContactPurchase = (data) => {
  const errors = [];

  if (!data.requestId || data.requestId.trim().length === 0) {
    errors.push("Request ID is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateConnectionRequest,
  validateTeacherPurchase,
  validateContactPurchase,
};
