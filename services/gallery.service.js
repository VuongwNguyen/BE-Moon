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

  async deleteGalleryItem({ id, userId }) {
    // Find image and verify ownership through galaxy
    const image = await GalleryModel.findById(id).populate('galaxyId');
    if (!image) {
      throw new errorResponse({
        message: "Image not found",
        statusCode: 404,
      });
    }

    if (image.galaxyId.userId.toString() !== userId.toString()) {
      throw new errorResponse({
        message: "Not authorized",
        statusCode: 403,
      });
    }

    await GalleryModel.findByIdAndDelete(id);
    return;
  }

  async getMyGalleryItems({ galaxyId, userId }) {
    // Verify user owns galaxy
    const galaxy = await GalaxyModel.findById(galaxyId);
    if (!galaxy || galaxy.userId.toString() !== userId.toString()) {
      throw new errorResponse({
        message: "Not authorized",
        statusCode: 403,
      });
    }

    // Return ALL images including inactive
    const galleryItems = await GalleryModel.find({ galaxyId })
      .sort({ createdAt: -1 });

    return galleryItems;
  }
}

module.exports = new GalleryService();
