const multer = require("multer");
const path = require("path");

const uploader = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const allowed = [".jpg", ".jpeg", ".png", ".mp4", ".mkv"];
    if (!allowed.includes(ext)) {
      cb(new Error("File type is not supported"));
      return;
    }
    cb(null, true);
  },
});

module.exports = uploader;
