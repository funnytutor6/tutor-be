/**
 * Validate student post data
 * @param {Object} data - Post data
 * @returns {Object} - { valid: boolean, errors: Array }
 */
const validateStudentPost = (data) => {
  const errors = [];

  if (
    !data.lessonType ||
    !["online", "in-person", "both"].includes(data.lessonType)
  ) {
    errors.push("Valid lesson type is required (online, in-person, or both)");
  }

  if (!data.subject || data.subject.trim().length === 0) {
    errors.push("Subject is required");
  }

  if (!data.headline || data.headline.trim().length === 0) {
    errors.push("Headline is required");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Check if text contains phone numbers or email addresses
 * @param {String} text - Text to check
 * @returns {Object} - { hasPhone: boolean, hasEmail: boolean }
 */
const containsContactInfo = (text) => {
  if (!text || typeof text !== "string") {
    return { hasPhone: false, hasEmail: false };
  }

  // Email regex pattern
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

  // Phone number regex patterns (various formats)
  // More specific patterns to avoid false positives:
  // - International: +1-234-567-8900, +44 20 1234 5678
  // - US format: (123) 456-7890, 123-456-7890
  // - UK format: 020 1234 5678, 07123 456789
  // - General: 10+ digits with separators
  const phonePatterns = [
    /\+?\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g, // International formats
    /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, // US format (123) 456-7890
    /\d{4}[-.\s]?\d{3}[-.\s]?\d{3}/g, // UK format variations
    /\d{10,}/g, // 10+ consecutive digits (likely phone number)
  ];

  const hasEmail = emailRegex.test(text);

  // Check if any phone pattern matches
  let hasPhone = false;
  for (const pattern of phonePatterns) {
    if (pattern.test(text)) {
      // Additional check: if it's just a year (4 digits) or short number, skip it
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const digitsOnly = match.replace(/\D/g, "");
          // Only flag as phone if it has 7+ digits (to avoid years like 2024)
          if (digitsOnly.length >= 7) {
            hasPhone = true;
            break;
          }
        }
      }
      if (hasPhone) break;
    }
  }

  return { hasPhone, hasEmail };
};

/**
 * Validate teacher post data
 * @param {Object} data - Post data
 * @returns {Object} - { valid: boolean, errors: Array }
 */
const validateTeacherPost = (data) => {
  const errors = [];

  if (!data.headline || data.headline.trim().length === 0) {
    errors.push("Headline is required");
  }

  if (!data.subject || data.subject.trim().length === 0) {
    errors.push("Subject is required");
  }

  if (!data.price || isNaN(data.price) || data.price <= 0) {
    errors.push("Valid price is required");
  }

  // Validate priceType - must be one of the allowed ENUM values
  const validPriceTypes = ["hourly", "daily", "weekly", "monthly"];
  if (data.priceType && !validPriceTypes.includes(data.priceType)) {
    // Map 'lesson' to 'hourly' for backward compatibility
    if (data.priceType === "lesson") {
      data.priceType = "hourly";
    } else {
      errors.push(
        `Invalid priceType. Must be one of: ${validPriceTypes.join(", ")}`
      );
    }
  }

  // Validate description - no phone numbers or emails allowed
  if (data.description) {
    const contactCheck = containsContactInfo(data.description);
    if (contactCheck.hasEmail) {
      errors.push("Description cannot contain email addresses");
    }
    if (contactCheck.hasPhone) {
      errors.push("Description cannot contain phone numbers");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

module.exports = {
  validateStudentPost,
  validateTeacherPost,
};
