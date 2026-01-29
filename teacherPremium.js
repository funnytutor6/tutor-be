// routes/teacherPremium.js - Teacher Premium CRUD Routes
const express = require("express");
const router = express.Router();
const { executeQuery, generateId } = require("./src/services/databaseService");

// GET all teacher premium records
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 30, filter } = req.query;
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM findtutor_premium_teachers";
    let params = [];

    // Add filtering if provided (basic email filter)
    if (filter) {
      if (filter.includes("mail=")) {
        const email = filter.split("'")[1]; // Extract email from filter string
        query += " WHERE mail = ?";
        params.push(email);
      }
    }

    query += " ORDER BY created DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const records = await executeQuery(query, params);

    // Get total count for pagination
    const countQuery =
      "SELECT COUNT(*) as total FROM findtutor_premium_teachers";
    const [countResult] = await executeQuery(countQuery);

    res.json({
      page: parseInt(page),
      perPage: parseInt(limit),
      totalItems: countResult.total,
      totalPages: Math.ceil(countResult.total / limit),
      items: records,
    });
  } catch (error) {
    console.error("Error fetching tutor premium records:", error);
    res.status(500).json({ error: "Failed to fetch records" });
  }
});

// GET single teacher premium record by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = "SELECT * FROM findtutor_premium_teachers WHERE id = ?";
    const records = await executeQuery(query, [id]);

    if (records.length === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.json(records[0]);
  } catch (error) {
    console.error("Error fetching  premium record:", error);
    res.status(500).json({ error: "Failed to fetch record" });
  }
});

// POST create new  premium record
router.post("/", async (req, res) => {
  try {
    const {
      link_or_video = true,
      link1 = "",
      link2 = "",
      link3 = "",
      video1 = null,
      video2 = null,
      video3 = null,
      ispaid = false,
      mail = "",
      paymentDate = null,
      stripeSessionId = null,
      paymentAmount = null,
    } = req.body;

    const id = await generateId();

    const query = `
      INSERT INTO findtutor_premium_teachers 
      (id, link_or_video, link1, link2, link3, video1, video2, video3, ispaid, mail, 
       paymentDate, stripeSessionId, paymentAmount)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      id,
      link_or_video,
      link1,
      link2,
      link3,
      video1,
      video2,
      video3,
      ispaid,
      mail,
      paymentDate,
      stripeSessionId,
      paymentAmount,
    ];

    await executeQuery(query, params);

    // Return the created record
    const createdRecord = await executeQuery(
      "SELECT * FROM findtutor_premium_teachers WHERE id = ?",
      [id]
    );

    res.status(201).json(createdRecord[0]);
  } catch (error) {
    console.error("Error creating  premium record:", error);
    res.status(500).json({ error: "Failed to create record" });
  }
});

// PATCH update  premium record
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
      UPDATE findtutor_premium_teachers 
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
      "SELECT * FROM findtutor_premium_teachers WHERE id = ?",
      [id]
    );

    res.json(updatedRecord[0]);
  } catch (error) {
    console.error("Error updating  premium record:", error);
    res.status(500).json({ error: "Failed to update record" });
  }
});

// DELETE  premium record
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const query = "DELETE FROM findtutor_premium_teachers WHERE id = ?";
    const result = await executeQuery(query, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Record not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting  premium record:", error);
    res.status(500).json({ error: "Failed to delete record" });
  }
});

// GET  premium status by email (special endpoint for your existing logic)
// GET  premium status by email
router.get("/status/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const query =
      "SELECT * FROM findtutor_premium_teachers WHERE mail = ? LIMIT 1";
    const [record] = await executeQuery(query, [email]);

    if (!record) {
      return res.json({
        hasPremium: false,
        isPaid: false,
        premiumData: null,
      });
    }

    res.json({
      hasPremium: true,
      isPaid: record.ispaid,
      premiumData: record,
    });
  } catch (error) {
    console.error("Error checking  premium status:", error);
    res.status(500).json({
      error: "Failed to check premium status",
      details: error.message,
    });
  }
});

// PUT update premium content (for your existing /update-premium-content logic)
router.put("/content/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { contentData } = req.body;

    if (!contentData) {
      return res.status(400).json({ error: "Content data is required" });
    }

    // Check for existing premium
    const [premiumRecord] = await executeQuery(
      "SELECT * FROM findtutor_premium_teachers WHERE mail = ? AND ispaid = true LIMIT 1",
      [email]
    );

    if (!premiumRecord) {
      return res
        .status(403)
        .json({ error: "Premium subscription required or not found" });
    }

    // Prepare update data
    const updateData = {
      link_or_video: contentData.link_or_video,
      updated: new Date(), // Explicitly set update time
    };

    // Add links or videos based on type
    if (contentData.link_or_video) {
      updateData.link1 = contentData.link1 || "";
      updateData.link2 = contentData.link2 || "";
      updateData.link3 = contentData.link3 || "";
    } else {
      updateData.video1 = contentData.video1 || null;
      updateData.video2 = contentData.video2 || null;
      updateData.video3 = contentData.video3 || null;
    }

    // Build parameterized query
    const fields = Object.keys(updateData);
    const setClause = fields.map((field) => `${field} = ?`).join(", ");
    const values = fields.map((field) => updateData[field]);

    await executeQuery(
      `UPDATE findtutor_premium_teachers SET ${setClause} WHERE id = ?`,
      [...values, premiumRecord.id]
    );

    // Return updated record
    const [updatedRecord] = await executeQuery(
      "SELECT * FROM findtutor_premium_teachers WHERE id = ?",
      [premiumRecord.id]
    );

    res.json({
      success: true,
      data: updatedRecord,
    });
  } catch (error) {
    console.error("Error updating premium content:", error);
    res.status(500).json({
      error: "Failed to update premium content",
      details: error.message,
    });
  }
});

module.exports = router;
