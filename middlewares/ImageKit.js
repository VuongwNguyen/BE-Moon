const ImageKit = require("imagekit");
const { errorResponse } = require("../context/responseHandle");
require("dotenv").config();

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

class ImageKitMiddleware {
  async uploadImage(req, res, next) {
    if (!req.files) return next();
    try {
      const uploadResults = await Promise.all(
        req.files.map((file) =>
          imagekit.upload({
            file: file.buffer,
            fileName: `${Date.now()}-${file.originalname}`,
            folder: "moon/images",
          })
        )
      );

      req.uploadedFiles = uploadResults;

      next();
    } catch (error) {
      console.log(error);
      throw new errorResponse({
        message: error.message,
        statusCode: 400,
      });
    }
  }

  async deleteImage(err, req, res, next) {
    if (err) {
      console.log(err);
      const images = req?.body?.image || [];
      try {
        await Promise.all(
          images.map((image) => {
            if (image.public_id) {
              return imagekit.deleteFile(image.public_id);
            }
          })
        );
      } catch (error) {
        console.log("ImageKit delete error:", error);
      } finally {
        return next(err);
      }
    } else {
      return next();
    }
  }
}

module.exports = new ImageKitMiddleware();
