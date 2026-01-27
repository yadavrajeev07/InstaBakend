const express = require('express');
const router = express.Router();
const {
  createReel,
  getReels,
  getFeedReels,
  getReel,
  updateReel,
  deleteReel,
  likeReel,
  commentReel,
  deleteComment
} = require('../controllers/reel.controller');
const { protect } = require('../middleware/auth.middleware');
const { uploadVideo } = require('../middleware/upload.middleware');

router.use(protect);

router.route('/')
  .post(uploadVideo.single('video'), createReel)
  .get(getReels);

router.get('/feed', getFeedReels);

router.route('/:id')
  .get(getReel)
  .put(updateReel)
  .delete(deleteReel);

router.put('/:id/like', likeReel);
router.post('/:id/comment', commentReel);
router.delete('/:id/comment/:commentId', deleteComment);

module.exports = router;