const GalleryModel = require("../models/gallery");
const GalaxyModel = require("../models/galaxy");
const { errorResponse } = require("../context/responseHandle");

class GalleryService {
  async createGallery({ galaxyId, title, description, uploadedFiles = [] }) {
    uploadedFiles.forEach(async (file) => {
      await GalleryModel.create({
        galaxyId,
        title,
        description,
        imageUrl: file.url,
      });
    });
    return;
  }

  async getGalleryItems({ galaxyId }) {
    const galleryItems = await GalleryModel.find({ galaxyId, status: "active" })
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
