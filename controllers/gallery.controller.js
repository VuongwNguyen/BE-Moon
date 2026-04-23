const GalleryService = require("../services/gallery.service");
const GalaxyModel = require("../models/galaxy");
const { successfullyResponse, errorResponse } = require("../context/responseHandle");

class GalleryController {
  async createGallery(req, res, next) {
    const { galaxyId, title, description } = req.body;

    if (!galaxyId) {
      return next(new errorResponse({ message: "galaxyId is required", statusCode: 400 }));
    }

    const galaxy = await GalaxyModel.findById(galaxyId);
    if (!galaxy) {
      return next(new errorResponse({ message: "Galaxy not found", statusCode: 404 }));
    }
    if (galaxy.userId.toString() !== req.user._id.toString()) {
      return next(new errorResponse({ message: "Forbidden", statusCode: 403 }));
    }

    const { uploadedFiles } = req;
    await GalleryService.createGallery({ galaxyId, title, description, uploadedFiles });

    return new successfullyResponse({
      message: "Gallery item created successfully",
    }).json(res);
  }

  async getGalleryItems(req, res, next) {
    const { galaxyId } = req.query;

    if (!galaxyId) {
      return next(new errorResponse({ message: "galaxyId is required", statusCode: 404 }));
    }

    const galleryItems = await GalleryService.getGalleryItems({ galaxyId });
    return new successfullyResponse({
      message: "Gallery items fetched successfully",
      meta: galleryItems,
    }).json(res);
  }

  async deleteGalleryItem(req, res, next) {
    const { id } = req.params;
    const userId = req.user._id;

    const result = await GalleryService.deleteGalleryItem({ id, userId });
    return new successfullyResponse({
      message: "Gallery item deleted successfully",
    }).json(res);
  }

  async getMyGalleryItems(req, res, next) {
    const { galaxyId } = req.query;
    const userId = req.user._id;

    if (!galaxyId) {
      return next(new errorResponse({ message: "galaxyId is required", statusCode: 400 }));
    }

    const galleryItems = await GalleryService.getMyGalleryItems({ galaxyId, userId });
    return new successfullyResponse({
      message: "My gallery items fetched successfully",
      meta: galleryItems,
    }).json(res);
  }
}

module.exports = new GalleryController();
