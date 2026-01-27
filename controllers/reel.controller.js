const Reel = require('../models/Reel');
const User = require('../models/User');
const Notification = require('../models/Notification');
const cloudinary = require('../config/cloudinary');

// @desc    Create a reel
// @route   POST /api/reels
// @access  Private
const createReel = async (req, res) => {
  try {
    const { caption } = req.body;
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a video'
      });
    }

    // Upload video to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'video',
      folder: 'social-media/reels'
    });

    const reel = await Reel.create({
      user: userId,
      caption,
      videoUrl: result.secure_url,
      videoPublicId: result.public_id,
      duration: result.duration
    });

    // Populate user details
    await reel.populate('user', 'username avatar');

    res.status(201).json({
      success: true,
      reel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all reels
// @route   GET /api/reels
// @access  Private
const getReels = async (req, res) => {
  try {
    const reels = await Reel.find()
      .sort({ createdAt: -1 })
      .populate('user', 'username avatar')
      .populate('comments.user', 'username avatar')
      .populate('likes', 'username avatar');

    res.json({
      success: true,
      reels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get reels from followed users
// @route   GET /api/reels/feed
// @access  Private
const getFeedReels = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const reels = await Reel.find({
      $or: [
        { user: req.user.id },
        { user: { $in: user.following } }
      ]
    })
    .sort({ createdAt: -1 })
    .populate('user', 'username avatar')
    .populate('comments.user', 'username avatar')
    .populate('likes', 'username avatar');

    res.json({
      success: true,
      reels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single reel
// @route   GET /api/reels/:id
// @access  Private
const getReel = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id)
      .populate('user', 'username avatar')
      .populate('comments.user', 'username avatar')
      .populate('likes', 'username avatar');

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    res.json({
      success: true,
      reel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update reel
// @route   PUT /api/reels/:id
// @access  Private
const updateReel = async (req, res) => {
  try {
    let reel = await Reel.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    // Check ownership
    if (reel.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    reel = await Reel.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'username avatar');

    res.json({
      success: true,
      reel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete reel
// @route   DELETE /api/reels/:id
// @access  Private
const deleteReel = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    // Check ownership
    if (reel.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Delete video from Cloudinary
    if (reel.videoPublicId) {
      await cloudinary.uploader.destroy(reel.videoPublicId, {
        resource_type: 'video'
      });
    }

    await reel.deleteOne();

    res.json({
      success: true,
      message: 'Reel deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Like/Unlike reel
// @route   PUT /api/reels/:id/like
// @access  Private
const likeReel = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    // Check if already liked
    const alreadyLiked = reel.likes.includes(req.user.id);

    if (alreadyLiked) {
      // Unlike
      reel.likes = reel.likes.filter(
        like => like.toString() !== req.user.id
      );
    } else {
      // Like
      reel.likes.push(req.user.id);

      // Create notification if not own reel
      if (reel.user.toString() !== req.user.id) {
        await Notification.create({
          user: reel.user,
          from: req.user.id,
          type: 'like',
          reel: reel._id,
          message: 'liked your reel'
        });
      }
    }

    await reel.save();

    res.json({
      success: true,
      likes: reel.likes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Comment on reel
// @route   POST /api/reels/:id/comment
// @access  Private
const commentReel = async (req, res) => {
  try {
    const { text } = req.body;
    const reel = await Reel.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    const comment = {
      user: req.user.id,
      text,
      createdAt: Date.now()
    };

    reel.comments.unshift(comment);

    // Create notification if not own reel
    if (reel.user.toString() !== req.user.id) {
      await Notification.create({
        user: reel.user,
        from: req.user.id,
        type: 'comment',
        reel: reel._id,
        message: 'commented on your reel'
      });
    }

    await reel.save();

    // Populate user details for the new comment
    await reel.populate('comments.user', 'username avatar');

    res.status(201).json({
      success: true,
      comments: reel.comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete comment
// @route   DELETE /api/reels/:id/comment/:commentId
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);

    if (!reel) {
      return res.status(404).json({
        success: false,
        message: 'Reel not found'
      });
    }

    // Find comment
    const comment = reel.comments.find(
      comment => comment._id.toString() === req.params.commentId
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check ownership
    if (comment.user.toString() !== req.user.id && reel.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    reel.comments = reel.comments.filter(
      comment => comment._id.toString() !== req.params.commentId
    );

    await reel.save();

    res.json({
      success: true,
      comments: reel.comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createReel,
  getReels,
  getFeedReels,
  getReel,
  updateReel,
  deleteReel,
  likeReel,
  commentReel,
  deleteComment
};