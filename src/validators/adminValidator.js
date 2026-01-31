const { z } = require("zod");

/**
 * Zod schema for common pagination & search query params
 */
const paginationSearchSchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive().max(1000)),
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().positive().max(100)),
  search: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  teacherId: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  studentId: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

/**
 * Validate pagination & search query using zod
 * @param {Object} query
 * @returns {{ valid: boolean, errors: string[], value?: { page: number, pageSize: number, search?: string } }}
 */
const validatePaginationSearch = (query) => {
  try {
    const value = paginationSearchSchema.parse(query || {});
    return {
      valid: true,
      errors: [],
      value,
    };
  } catch (err) {
    const errors = err.errors
      ? err.errors.map((e) => e.message || "Invalid query parameter")
      : ["Invalid query parameters"];
    return {
      valid: false,
      errors,
    };
  }
};

module.exports = {
  validatePaginationSearch,
};
