const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const PostSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  caption: {
    type: String,
    trim: true,
    maxlength: 2200
  },
  image: {
    type: String,
    required: true
  },
  imagePublicId: {
    type: String
  },
  location: {
    type: String,
    trim: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [CommentSchema],
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index for faster querying
PostSchema.index({ user: 1, createdAt: -1 });
PostSchema.index({ likes: 1 });
PostSchema.index({ tags: 1 });

// Virtual for like count
PostSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
PostSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

module.exports = mongoose.model('Post', PostSchema);