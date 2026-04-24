const router = require('express').Router();
const asyncHandler = require('../context/asyncHandler');
const { requireAuth } = require('../middlewares/auth');
const MediaController = require('../controllers/media.controller');
const ImageKit = require('../middlewares/ImageKit');
const multer = require('multer');
const path = require('path');

// Setup multer for music upload (memory storage for ImageKit)
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowed = ['.mp3', '.wav', '.ogg', '.m4a'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files allowed'));
    }
  }
});

// Public routes - user xem danh sách
router.get('/themes', asyncHandler(MediaController.getThemes));
router.get('/musics', asyncHandler(MediaController.getMusics));

// Admin routes - cần thêm middleware kiểm tra admin
router.post('/themes', requireAuth, asyncHandler(MediaController.createTheme));
router.put('/themes/:id', requireAuth, asyncHandler(MediaController.updateTheme));
router.delete('/themes/:id', requireAuth, asyncHandler(MediaController.deleteTheme));

router.post('/upload-music', requireAuth, upload.single('file'), ImageKit.uploadMusic.bind(ImageKit), asyncHandler(MediaController.uploadMusic));
router.post('/musics', requireAuth, asyncHandler(MediaController.createMusic));
router.put('/musics/:id', requireAuth, asyncHandler(MediaController.updateMusic));
router.delete('/musics/:id', requireAuth, asyncHandler(MediaController.deleteMusic));

module.exports = router;
