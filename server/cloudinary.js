import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Upload an image to Cloudinary
 * @param {String} imagePath - Path to the image file
 * @return {Promise<Object>} - Cloudinary upload response
 */
export async function uploadImage(imagePath) {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder: 'verkefnalisti-mana',
      use_filename: true,
      unique_filename: true,
      overwrite: false
    });
    
    return {
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw error;
  }
}

/**
 * Delete an image from Cloudinary
 * @param {String} publicId - Public ID of the image to delete
 * @return {Promise<Object>} - Cloudinary delete response
 */
export async function deleteImage(publicId) {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error);
    throw error;
  }
}

export default cloudinary;
