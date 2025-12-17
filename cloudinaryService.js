const cloudinary = require("cloudinary").v2;
require("dotenv").config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
          console.error("❌ Cloudinary upload error:", error);
          reject(error);
        } else {
          console.log("✅ Image uploaded to Cloudinary:", result.secure_url);
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
    console.log("✅ Image deleted from Cloudinary:", publicId);
    return result;
  } catch (error) {
    console.error("❌ Cloudinary delete error:", error);
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
    console.log(
      "✅ Image uploaded to Cloudinary from base64:",
      result.secure_url
    );
    return result;
  } catch (error) {
    console.error("❌ Cloudinary upload error:", error);
    throw error;
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  uploadImageFromBase64,
  cloudinary,
};


