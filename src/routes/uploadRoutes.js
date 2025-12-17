const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/uploadController");
const { upload } = require("../middleware/uploadMiddleware");

router.post("/upload-image", upload.single("image"), uploadController.uploadImage);
router.post("/delete-image", uploadController.deleteImage);

module.exports = router;

