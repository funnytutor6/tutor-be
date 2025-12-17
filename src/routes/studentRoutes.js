const express = require("express");
const router = express.Router();
const studentController = require("../controllers/studentController");
const { upload } = require("../middleware/uploadMiddleware");
const { authenticate } = require("../middleware/authMiddleware");

router.get("/", studentController.getAllStudents);
router.get("/:id", studentController.getStudentById);
router.put(
  "/",
  authenticate,
  upload.single("profilePhoto"),
  studentController.updateStudent
);

module.exports = router;
