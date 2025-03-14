// Cloudinary integration - Fyrir myndaupphleðslu
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Stilla Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

/**
 * Hlaða upp mynd á Cloudinary með resize
 * @param {String} imagePath - Slóð á mynd
 * @param {Object} options - Auka stillingar
 * @return {Promise<Object>} - Cloudinary svör
 */
export async function uploadImage(imagePath, options = {}) {
  try {
    // Default transformation stillingar fyrir myndir
    const transformationOptions = {
      folder: 'verkefnalisti-mana',
      use_filename: true,
      unique_filename: true,
      overwrite: false,
      // Mynda-bestun stillingar
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }, // Takmarka max stærð
        { quality: 'auto:good', fetch_format: 'auto' } // Besta gæði og snið
      ]
    };
    
    // Sameina við custom stillingar
    const finalOptions = { ...transformationOptions, ...options };
    
    const result = await cloudinary.uploader.upload(imagePath, finalOptions);
    
    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes
    };
  } catch (error) {
    console.error('Villa við að hlaða upp á Cloudinary:', error);
    throw error;
  }
}

/**
 * Eyða mynd frá Cloudinary
 * @param {String} publicId - Auðkenni myndar
 * @return {Promise<Object>} - Cloudinary svör
 */
export async function deleteImage(publicId) {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Villa við að eyða mynd frá Cloudinary:', error);
    throw error;
  }
}

export default cloudinary;
