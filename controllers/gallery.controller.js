const GalleryService = require("../services/gallery.service");
const { successfullyResponse } = require("../context/responseHandle");

class GalleryController {
  async createGallery(req, res, next) {
    const { title, description } = req.body;
    const { uploadedFiles } = req;
    const galleryItem = await GalleryService.createGallery({
      title,
      description,
      uploadedFiles,
    });

    return new successfullyResponse({
      message: "Gallery item created successfully",
    }).json(res);
  }

 async getGalleryItems(req, res, next) {
    const galleryItems = await GalleryService.getGalleryItems();
    return new successfullyResponse({
      message: "Gallery items fetched successfully",
      meta: galleryItems,
    }).json(res);
  }
}

module.exports = new GalleryController();
