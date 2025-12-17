const { executeQuery } = require("../config/database");

// Function to generate IDs (fallback if MySQL function fails)
const generateId = async () => {
  try {
    const [result] = await executeQuery(
      "SELECT generate_pocketbase_id() as id"
    );
    return result.id;
  } catch (error) {
    // Fallback to JavaScript implementation if MySQL function doesn't exist
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
};

module.exports = { generateId };

