const GalleryService = require("../services/gallery.service");
const { successfullyResponse, errorResponse } = require("../context/responseHandle");

class GalleryController {
  async createGallery(req, res, next) {
    const { name, title, description } = req.body;

    if (!name) {
      return next(new errorResponse({ message: "name is required", statusCode: 400 }));
    }

    const { uploadedFiles } = req;
    await GalleryService.createGallery({ name, title, description, uploadedFiles });

    return new successfullyResponse({
      message: "Gallery item created successfully",
    }).json(res);
  }

  async getGalleryItems(req, res, next) {
    const { name } = req.query;

    if (!name) {
      return next(new errorResponse({ message: "name is required", statusCode: 404 }));
    }

    const galleryItems = await GalleryService.getGalleryItems({ name });
    return new successfullyResponse({
      message: "Gallery items fetched successfully",
      meta: galleryItems,
    }).json(res);
  }
}

module.exports = new GalleryController();
