const Post = require('../models/Post');
const User = require('../models/User');
const Notification = require('../models/Notification');
const cloudinary = require('../config/cloudinary');

// @desc    Create a post
// @route   POST /api/posts
// @access  Private
const createPost = async (req, res) => {
  try {
    const { caption, location } = req.body;
    const userId = req.user.id;

    let imageUrl = '';
    let publicId = '';

    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        folder: 'social-media/posts'
      });
      imageUrl = result.secure_url;
      publicId = result.public_id;
    }

    const post = await Post.create({
      user: userId,
      caption,
      location,
      image: imageUrl,
      imagePublicId: publicId
    });

    // Populate user details
    await post.populate('user', 'username avatar');

    res.status(201).json({
      success: true,
      post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all posts
// @route   GET /api/posts
// @access  Private
const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('user', 'username avatar')
      .populate('comments.user', 'username avatar')
      .populate('likes', 'username avatar');

    res.json({
      success: true,
      posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get posts from followed users
// @route   GET /api/posts/feed
// @access  Private
const getFeedPosts = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    const posts = await Post.find({
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
      posts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single post
// @route   GET /api/posts/:id
// @access  Private
const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username avatar')
      .populate('comments.user', 'username avatar')
      .populate('likes', 'username avatar');

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.json({
      success: true,
      post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update post
// @route   PUT /api/posts/:id
// @access  Private
const updatePost = async (req, res) => {
  try {
    let post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    post = await Post.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('user', 'username avatar');

    res.json({
      success: true,
      post
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete post
// @route   DELETE /api/posts/:id
// @access  Private
const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check ownership
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Delete image from Cloudinary
    if (post.imagePublicId) {
      await cloudinary.uploader.destroy(post.imagePublicId);
    }

    await post.deleteOne();

    res.json({
      success: true,
      message: 'Post deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Like/Unlike post
// @route   PUT /api/posts/:id/like
// @access  Private
const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Check if already liked
    const alreadyLiked = post.likes.includes(req.user.id);

    if (alreadyLiked) {
      // Unlike
      post.likes = post.likes.filter(
        like => like.toString() !== req.user.id
      );
    } else {
      // Like
      post.likes.push(req.user.id);

      // Create notification if not own post
      if (post.user.toString() !== req.user.id) {
        await Notification.create({
          user: post.user,
          from: req.user.id,
          type: 'like',
          post: post._id,
          message: 'liked your post'
        });
      }
    }

    await post.save();

    res.json({
      success: true,
      likes: post.likes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Comment on post
// @route   POST /api/posts/:id/comment
// @access  Private
const commentPost = async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const comment = {
      user: req.user.id,
      text,
      createdAt: Date.now()
    };

    post.comments.unshift(comment);

    // Create notification if not own post
    if (post.user.toString() !== req.user.id) {
      await Notification.create({
        user: post.user,
        from: req.user.id,
        type: 'comment',
        post: post._id,
        message: 'commented on your post'
      });
    }

    await post.save();

    // Populate user details for the new comment
    await post.populate('comments.user', 'username avatar');

    res.status(201).json({
      success: true,
      comments: post.comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete comment
// @route   DELETE /api/posts/:id/comment/:commentId
// @access  Private
const deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    // Find comment
    const comment = post.comments.find(
      comment => comment._id.toString() === req.params.commentId
    );

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check ownership
    if (comment.user.toString() !== req.user.id && post.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    post.comments = post.comments.filter(
      comment => comment._id.toString() !== req.params.commentId
    );

    await post.save();

    res.json({
      success: true,
      comments: post.comments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createPost,
  getPosts,
  getFeedPosts,
  getPost,
  updatePost,
  deletePost,
  likePost,
  commentPost,
  deleteComment
};