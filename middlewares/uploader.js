const multer = require("multer");
const path = require("path");

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB — ImageKit free tier limit

const uploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
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
