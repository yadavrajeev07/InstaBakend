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

const ReelSchema = new mongoose.Schema({
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
  videoUrl: {
    type: String,
    required: true
  },
  videoPublicId: {
    type: String
  },
  duration: {
    type: Number
  },
  thumbnail: {
    type: String
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [CommentSchema],
  views: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }]
}, {
  timestamps: true
});

// Index for faster querying
ReelSchema.index({ user: 1, createdAt: -1 });
ReelSchema.index({ likes: 1 });
ReelSchema.index({ tags: 1 });

// Virtual for like count
ReelSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

// Virtual for comment count
ReelSchema.virtual('commentCount').get(function() {
  return this.comments.length;
});

module.exports = mongoose.model('Reel', ReelSchema);