const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['like', 'comment', 'follow', 'message', 'mention'],
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  reel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reel'
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for faster querying
NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);