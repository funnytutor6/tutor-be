/**
 * Format ISO date string to MySQL DATETIME format
 * @param {String} isoString - ISO date string
 * @returns {String} - MySQL DATETIME format (YYYY-MM-DD HH:MM:SS)
 */
function formatDateForMySQL(isoString) {
  const date = new Date(isoString);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get current MySQL DATETIME format
 * @returns {String} - Current date in MySQL DATETIME format
 */
function getCurrentMySQLDateTime() {
  return formatDateForMySQL(new Date().toISOString());
}

module.exports = {
  formatDateForMySQL,
  getCurrentMySQLDateTime,
};

