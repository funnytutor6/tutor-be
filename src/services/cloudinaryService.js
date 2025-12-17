const cloudinary = require("../config/cloudinary");
const logger = require("../utils/logger");

/**
 * Upload image buffer to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer from multer
 * @param {String} folder - Folder name in Cloudinary (optional)
 * @returns {Promise<Object>} - Upload result with URL
 */
const uploadImage = (fileBuffer, folder = "teacher-profiles") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: "image",
        transformation: [
          { width: 500, height: 500, crop: "limit" },
          { quality: "auto" },
        ],
      },
      (error, result) => {
        if (error) {
          logger.error("Cloudinary upload error:", error);
          reject(error);
        } else {
          logger.info("Image uploaded to Cloudinary:", result.secure_url);
          resolve(result);
        }
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete image from Cloudinary
 * @param {String} publicId - The public ID of the image
 * @returns {Promise<Object>} - Delete result
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info("Image deleted from Cloudinary:", publicId);
    return result;
  } catch (error) {
    logger.error("Cloudinary delete error:", error);
    throw error;
  }
};

/**
 * Upload image from base64 string
 * @param {String} base64String - Base64 encoded image
 * @param {String} folder - Folder name in Cloudinary (optional)
 * @returns {Promise<Object>} - Upload result with URL
 */
const uploadImageFromBase64 = async (
  base64String,
  folder = "teacher-profiles"
) => {
  try {
    const result = await cloudinary.uploader.upload(base64String, {
      folder: folder,
      resource_type: "image",
      transformation: [
        { width: 500, height: 500, crop: "limit" },
        { quality: "auto" },
      ],
    });
    logger.info("Image uploaded to Cloudinary from base64:", result.secure_url);
    return result;
  } catch (error) {
    logger.error("Cloudinary upload error:", error);
    throw error;
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  uploadImageFromBase64,
};

