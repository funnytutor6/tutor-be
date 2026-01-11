// routes/studentPremium.js - Student Premium CRUD Routes
const express = require("express");
const router = express.Router();
const { executeQuery, generateId } = require("./src/services/databaseService");

function formatDateForMySQL(isoString) {
  const date = new Date(isoString);

  // Format: 'YYYY-MM-DD HH:MM:SS'
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Alternative: Use NOW() for current timestamp
function getCurrentMySQLDateTime() {
  return formatDateForMySQL(new Date().toISOString());
}

// GET all student premium records
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 30, filter } = req.query;
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM findtitor_premium_student";
    let params = [];

    // Add filtering if provided (basic email filter)
    if (filter) {
      if (filter.includes("email=")) {
        const email = filter.split("'")[1]; // Extract email from filter string
        query += " WHERE email = ?";
        params.push(email);
      }
    }

    query += " ORDER BY created DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const records = await executeQuery(query, params);

    // Get total count for pagination
    const countQuery =
      "SELECT COUNT(*) as total FROM findtitor_premium_student";
    const [countResult] = await executeQuery(countQuery);

    res.json({
      page: parseInt(page),
      perPage: parseInt(limit),
      totalItems: countResult.total,
      totalPages: Math.ceil(countResult.total / limit),
      items: records,
    });
  } catch (error) {
    console.error("Error fetching student premium records:", error);
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

// GET single student premium record by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = "SELECT * FROM findtitor_premium_student WHERE id = ?";
    const records = await executeQuery(query, [id]);

    if (records.length === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json(records[0]);
  } catch (error) {
    console.error("Error fetching student premium record:", error);
    res.status(500).json({ error: "Failed to fetch record" });
  }
});

// POST create new student premium record
// Fix for MySQL DATETIME format issue

// ==================== HELPER FUNCTION ====================
// Add this helper function to convert ISO dates to MySQL DATETIME format
function formatDateForMySQL(isoString) {
  const date = new Date(isoString);

  // Format: 'YYYY-MM-DD HH:MM:SS'
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// Alternative: Use NOW() for current timestamp
function getCurrentMySQLDateTime() {
  return formatDateForMySQL(new Date().toISOString());
}

// ==================== FIXED STUDENT PREMIUM ROUTES ====================

// Fixed POST route in studentPremium.js
router.post("/", async (req, res) => {
  try {
    const {
      subject = "",
      email = "",
      mobile = "",
      topix = "",
      descripton = "",
      ispayed = false,
      paymentDate = null,
      stripeSessionId = null,
      paymentAmount = null,
    } = req.body;

    // CRITICAL FIX: Await the generateId() function
    const id = await generateId(); // <-- Added 'await' here

    // Fix the paymentDate format for MySQL
    let formattedPaymentDate = null;
    if (paymentDate) {
      if (typeof paymentDate === "string" && paymentDate.includes("T")) {
        // ISO string format - convert to MySQL DATETIME
        formattedPaymentDate = formatDateForMySQL(paymentDate);
      } else {
        // Already in correct format or use as-is
        formattedPaymentDate = paymentDate;
      }
    }

    const query = `
      INSERT INTO findtitor_premium_student 
      (id, subject, email, mobile, topix, descripton, ispayed, paymentDate, stripeSessionId, paymentAmount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      subject,
      email,
      mobile,
      topix,
      descripton,
      ispayed,
      formattedPaymentDate,
      stripeSessionId,
      paymentAmount,
    ];

    await executeQuery(query, params);

    // Return the created record
    const createdRecord = await executeQuery(
      "SELECT * FROM findtitor_premium_student WHERE id = ?",
      [id]
    );

    res.status(201).json(createdRecord[0]);
  } catch (error) {
    console.error("Error creating student premium record:", error);
    res.status(500).json({ error: "Failed to create record" });
  }
});

// PATCH update student premium record
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove id from updates if present
    delete updates.id;
    delete updates.created; // Don't allow updating created timestamp

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    // Build dynamic update query
    const updateFields = Object.keys(updates)
      .map((field) => `${field} = ?`)
      .join(", ");
    const updateValues = Object.values(updates);

    const query = `
      UPDATE findtitor_premium_student 
      SET ${updateFields}, updated = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;

    updateValues.push(id);

    const result = await executeQuery(query, updateValues);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    // Return updated record
    const updatedRecord = await executeQuery(
      "SELECT * FROM findtitor_premium_student WHERE id = ?",
      [id]
    );

    res.json(updatedRecord[0]);
  } catch (error) {
    console.error("Error updating student premium record:", error);
    res.status(500).json({ error: "Failed to update record" });
  }
});

// DELETE student premium record
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = "DELETE FROM findtitor_premium_student WHERE id = ?";
    const result = await executeQuery(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting student premium record:", error);
    res.status(500).json({ error: "Failed to delete record" });
  }
});

// GET student premium status by email (special endpoint for your existing logic)
router.get("/status/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const query = "SELECT * FROM findtitor_premium_student WHERE email = ?";
    const records = await executeQuery(query, [email]);

    if (records.length === 0) {
      return res.json({
        hasPremium: false,
        isPaid: false,
        premiumData: null,
      });
    }

    const premiumData = records[0];
    res.json({
      hasPremium: true,
      isPaid: premiumData.ispayed,
      premiumData: premiumData,
    });
  } catch (error) {
    console.error("Error checking student premium status:", error);
    res.status(500).json({ error: "Failed to check premium status" });
  }
});

module.exports = router;
