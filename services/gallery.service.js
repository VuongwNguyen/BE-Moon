const GalleryModel = require("../models/gallery");
const { errorResponse } = require("../context/responseHandle");

class GalleryService {
  async createGallery({ title, description, uploadedFiles = [] }) {
    uploadedFiles.forEach(async (file) => {
      await GalleryModel.create({
        title,
        description,
        imageUrl: file.url, // Assuming the uploaded file object has a 'url' property
      });
    });

    return;
  }
  async getGalleryItems() {
    const galleryItems = await GalleryModel.find({ status: "active" }).sort({
      createdAt: -1,
    });
    if (!galleryItems) {
      throw new errorResponse({
        message: "error while fetching gallery items",
        statusCode: 404,
      });
    }
    return galleryItems;
  }
}

module.exports = new GalleryService();
// This service handles the creation of gallery items in the database.
