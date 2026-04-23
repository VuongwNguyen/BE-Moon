const asyncHandler = require("../context/asyncHandler");
const router = require("express").Router();
const uploader = require("../middlewares/uploader");
const ImageKit = require("../middlewares/ImageKit");
const { requireAuth } = require("../middlewares/auth");
const GalleryController = require("../controllers/gallery.controller");

router.post(
  "/upload",
  requireAuth,
  uploader.array("files", 50),
  ImageKit.uploadImage,
  asyncHandler(GalleryController.createGallery)
);
router.get(
  "/items",
  asyncHandler(GalleryController.getGalleryItems)
);

module.exports = router;
