const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateProfile,
  searchUsers,
  followUser,
  getSuggestions,
  changePassword
} = require('../controllers/user.controller');
const { protect } = require('../middleware/auth.middleware');
const { uploadImage } = require('../middleware/upload.middleware');

// Make search public
router.get('/search', searchUsers);

// Protect everything else
router.use(protect);

router.get('/suggestions', getSuggestions);
router.put('/profile', uploadImage.single('avatar'), updateProfile);
router.put('/change-password', changePassword);
router.get('/:id', getUserProfile);
router.put('/:id/follow', followUser);

module.exports = router;
