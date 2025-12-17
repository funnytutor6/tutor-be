const cloudinaryService = require("../services/cloudinaryService");
const { successResponse, errorResponse } = require("../utils/responseHelper");
const logger = require("../utils/logger");

/**
 * Upload image to Cloudinary
 */
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, "No image file provided", 400);
    }

    const folder = req.body.folder || "teacher-profiles";

    logger.info("Uploading image to Cloudinary:", {
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      folder: folder,
    });

    const result = await cloudinaryService.uploadImage(req.file.buffer, folder);
    console.log("Result:", result);

    return successResponse(res, {
      message: "Image uploaded successfully",
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
    });
  } catch (error) {
    logger.error("Error uploading image:", error);
    return errorResponse(res, "Failed to upload image", 500);
  }
};

/**
 * Delete image from Cloudinary
 */
exports.deleteImage = async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return errorResponse(res, "Public ID is required", 400);
    }

    logger.info("Deleting image from Cloudinary:", publicId);

    const result = await cloudinaryService.deleteImage(publicId);

    return successResponse(res, {
      message: "Image deleted successfully",
      result: result,
    });
  } catch (error) {
    logger.error("Error deleting image:", error);
    return errorResponse(res, "Failed to delete image", 500);
  }
};
