const User = require('../models/User');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const Notification = require('../models/Notification');
const cloudinary = require('../config/cloudinary');

// @desc    Get user profile
// @route   GET /api/users/:id
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers', 'username avatar')
      .populate('following', 'username avatar');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's posts and reels
    const posts = await Post.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate('user', 'username avatar');
    
    const reels = await Reel.find({ user: user._id })
      .sort({ createdAt: -1 })
      .populate('user', 'username avatar');

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        posts,
        reels,
        postCount: posts.length,
        reelCount: reels.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { username, bio, email } = req.body;
    const userId = req.user.id;

    let updateData = { username, bio, email };

    // Handle avatar upload
    if (req.file) {
      // Delete old avatar if exists
      const user = await User.findById(userId);
      if (user.avatarPublicId) {
        await cloudinary.uploader.destroy(user.avatarPublicId);
      }

      // Upload new avatar
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'social-media/avatars'
      });

      updateData.avatar = result.secure_url;
      updateData.avatarPublicId = result.public_id;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Search users
// @route   GET /api/users/search
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('username avatar bio followers following');

    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Follow/Unfollow user
// @route   PUT /api/users/:id/follow
// @access  Private
const followUser = async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if already following
    const isFollowing = currentUser.following.includes(userToFollow._id);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        id => id.toString() !== userToFollow._id.toString()
      );
      userToFollow.followers = userToFollow.followers.filter(
        id => id.toString() !== currentUser._id.toString()
      );
    } else {
      // Follow
      currentUser.following.push(userToFollow._id);
      userToFollow.followers.push(currentUser._id);

      // Create notification
      await Notification.create({
        user: userToFollow._id,
        from: currentUser._id,
        type: 'follow',
        message: 'started following you'
      });
    }

    await currentUser.save();
    await userToFollow.save();

    res.json({
      success: true,
      following: isFollowing ? false : true,
      followers: userToFollow.followers.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get suggestions
// @route   GET /api/users/suggestions
// @access  Private
const getSuggestions = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    // Get users not followed by current user
    const suggestions = await User.find({
      _id: { 
        $ne: user._id,
        $nin: user.following 
      }
    })
    .limit(10)
    .select('username avatar bio followers')
    .sort({ followers: -1 });

    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getUserProfile,
  updateProfile,
  searchUsers,
  followUser,
  getSuggestions,
  changePassword
};