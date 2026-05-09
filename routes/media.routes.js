const router = require('express').Router();
const asyncHandler = require('../context/asyncHandler');
const { requireAuth, requireAdmin } = require('../middlewares/auth');
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
router.post('/themes', requireAuth, requireAdmin, asyncHandler(MediaController.createTheme));
router.put('/themes/:id', requireAuth, requireAdmin, asyncHandler(MediaController.updateTheme));
router.delete('/themes/:id', requireAuth, requireAdmin, asyncHandler(MediaController.deleteTheme));

router.post('/upload-music', requireAuth, requireAdmin, upload.single('file'), ImageKit.uploadMusic.bind(ImageKit), asyncHandler(MediaController.uploadMusic));
router.post('/musics', requireAuth, requireAdmin, asyncHandler(MediaController.createMusic));
router.put('/musics/:id', requireAuth, requireAdmin, asyncHandler(MediaController.updateMusic));
router.delete('/musics/:id', requireAuth, requireAdmin, asyncHandler(MediaController.deleteMusic));

module.exports = router;
