const { executeQuery } = require("../config/database");
const { generateId } = require("../utils/idGenerator");

module.exports = {
  executeQuery,
  generateId,
};

