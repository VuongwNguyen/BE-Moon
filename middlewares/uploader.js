const multer = require("multer");
const path = require("path");

const uploader = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    let ext = path.extname(file.originalname);
    if (
      ext !== ".mp4" &&
      ext !== ".mkv" &&
      ext !== ".jpeg" &&
      ext !== ".png" &&
      ext !== ".jpg" &&
      ext !== ".JPG"  
    ) {
      cb(new Error("File type is not supported"));
      return;
    }

    cb(null, true);
  },
});

module.exports = uploader;
