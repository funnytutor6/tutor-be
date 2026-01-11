const express = require("express");
const router = express.Router();
const teacherController = require("../controllers/teacherController");
const { upload } = require("../middleware/uploadMiddleware");
const {
  authenticate,
  optionalAuthenticate,
} = require("../middleware/authMiddleware");

router.get("/", authenticate, teacherController.getAllTeachers);
router.get("/metrics", authenticate, teacherController.getTeacherMetrics);
router.put(
  "/:id",
  upload.single("profilePhoto"),
  teacherController.updateTeacher
);
router.delete("/:id", authenticate, teacherController.deleteTeacher);
router.get(
  "/public/:id",
  optionalAuthenticate,
  teacherController.getPublicTeacherById
);
router.get("/:id", authenticate, teacherController.getTeacherById);

module.exports = router;
