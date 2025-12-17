// routes/subscriptions.js - Subscriptions CRUD Routes
const express = require("express");
const router = express.Router();
const { executeQuery, generateId } = require("./src/services/databaseService");

// GET all subscription records
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 30, filter } = req.query;
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM findtutor_subcriptions";
    let params = [];

    // Add filtering if provided (basic email filter)
    if (filter) {
      if (filter.includes("field=")) {
        const email = filter.split("'")[1]; // Extract email from filter string
        query += " WHERE field = ?";
        params.push(email);
      }
    }

    query += " ORDER BY created DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const records = await executeQuery(query, params);

    // Get total count for pagination
    const countQuery = "SELECT COUNT(*) as total FROM findtutor_subcriptions";
    const [countResult] = await executeQuery(countQuery);

    res.json({
      page: parseInt(page),
      perPage: parseInt(limit),
      totalItems: countResult.total,
      totalPages: Math.ceil(countResult.total / limit),
      items: records,
    });
  } catch (error) {
    console.error("Error fetching subscription records:", error);
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

// GET single subscription record by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = "SELECT * FROM findtutor_subcriptions WHERE id = ?";
    const records = await executeQuery(query, [id]);

    if (records.length === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json(records[0]);
  } catch (error) {
    console.error("Error fetching subscription record:", error);
    res.status(500).json({ error: "Failed to fetch record" });
  }
});

// POST create new subscription record
router.post("/", async (req, res) => {
  try {
    const { field = "" } = req.body; // field is the email in this table

    if (!field) {
      return res.status(400).json({ error: "Email field is required" });
    }

    // Check if email already exists
    const existingQuery =
      "SELECT * FROM findtutor_subcriptions WHERE field = ?";
    const existing = await executeQuery(existingQuery, [field]);

    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already subscribed" });
    }

    const id = await generateId();

    const query = `
      INSERT INTO findtutor_subcriptions (id, field)
      VALUES (?, ?)
    `;

    await executeQuery(query, [id, field]);

    // Return the created record
    const createdRecord = await executeQuery(
      "SELECT * FROM findtutor_subcriptions WHERE id = ?",
      [id]
    );

    res.status(201).json(createdRecord[0]);
  } catch (error) {
    console.error("Error creating subscription record:", error);
    res.status(500).json({ error: "Failed to create record" });
  }
});

// PATCH update subscription record
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
      UPDATE findtutor_subcriptions 
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
      "SELECT * FROM findtutor_subcriptions WHERE id = ?",
      [id]
    );

    res.json(updatedRecord[0]);
  } catch (error) {
    console.error("Error updating subscription record:", error);
    res.status(500).json({ error: "Failed to update record" });
  }
});

// DELETE subscription record
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = "DELETE FROM findtutor_subcriptions WHERE id = ?";
    const result = await executeQuery(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting subscription record:", error);
    res.status(500).json({ error: "Failed to delete record" });
  }
});

// DELETE subscription by email (convenience endpoint)
router.delete("/email/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const query = "DELETE FROM findtutor_subcriptions WHERE field = ?";
    const result = await executeQuery(query, [email]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    res.json({ message: "Unsubscribed successfully" });
  } catch (error) {
    console.error("Error unsubscribing:", error);
    res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

// GET check if email is subscribed (convenience endpoint)
router.get("/check/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const query = "SELECT * FROM findtutor_subcriptions WHERE field = ?";
    const records = await executeQuery(query, [email]);

    res.json({
      isSubscribed: records.length > 0,
      subscription: records.length > 0 ? records[0] : null,
    });
  } catch (error) {
    console.error("Error checking subscription:", error);
    res.status(500).json({ error: "Failed to check subscription" });
  }
});

module.exports = router;
