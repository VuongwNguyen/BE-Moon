const GalleryModel = require("../models/gallery");
const GalaxyModel = require("../models/galaxy");
const { errorResponse } = require("../context/responseHandle");

class GalleryService {
  async createGallery({ galaxyId, title, description, stage, uploadedFiles = [] }) {
    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      await GalleryModel.create({
        galaxyId,
        title,
        description,
        imageUrl: file.url,
        fileId: file.fileId || null,
        stage: stage || null,
        order: i,
      });
    }
    return;
  }

  async getGalleryItems({ galaxyId }) {
    const galleryItems = await GalleryModel.find({ galaxyId, status: 'active' })
      .sort({ createdAt: -1 });

    if (!galleryItems) {
      throw new errorResponse({ message: 'error while fetching gallery items', statusCode: 404 });
    }

    const STAGE_ORDER = { intro: 0, memory: 1, highlight: 2, ending: 3 };
    const hasStages = galleryItems.some(item => item.stage);
    if (hasStages) {
      galleryItems.sort((a, b) => {
        const sa = STAGE_ORDER[a.stage] ?? 99;
        const sb = STAGE_ORDER[b.stage] ?? 99;
        if (sa !== sb) return sa - sb;
        return (a.order || 0) - (b.order || 0);
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

    // Delete from ImageKit
    if (image.imageUrl) {
      const ImageKit = require("imagekit");
      const imagekit = new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
      });
      
      try {
        const fileId = image.fileId;
        if (!fileId) throw new Error("No fileId stored");
        await imagekit.deleteFile(fileId);
      } catch (error) {
        console.error("Failed to delete image from ImageKit:", error);
      }
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
