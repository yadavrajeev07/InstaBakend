const express = require('express');
const router = express.Router();
const {
  createPost,
  getPosts,
  getFeedPosts,
  getPost,
  updatePost,
  deletePost,
  likePost,
  commentPost,
  deleteComment
} = require('../controllers/post.controller');
const { protect } = require('../middleware/auth.middleware');
const { uploadImage } = require('../middleware/upload.middleware');

router.use(protect);

router.route('/')
  .post(uploadImage.single('image'), createPost)
  .get(getPosts);

router.get('/feed', getFeedPosts);

router.route('/:id')
  .get(getPost)
  .put(updatePost)
  .delete(deletePost);

router.put('/:id/like', likePost);
router.post('/:id/comment', commentPost);
router.delete('/:id/comment/:commentId', deleteComment);

module.exports = router;