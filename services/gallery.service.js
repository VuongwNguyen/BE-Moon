const GalleryModel = require("../models/gallery");
const { errorResponse } = require("../context/responseHandle");

class GalleryService {
  async createGallery({ name, title, description, uploadedFiles = [] }) {
    uploadedFiles.forEach(async (file) => {
      await GalleryModel.create({
        name,
        title,
        description,
        imageUrl: file.url,
      });
    });

    return;
  }

  async getGalleryItems({ name }) {
    const galleryItems = await GalleryModel.find({ name, status: "active" })
      .sort({ createdAt: -1 })
      .limit(200);

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
