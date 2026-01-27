const Notification = require('../models/Notification');

// @desc    Get all notifications for user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .populate('from', 'username avatar')
      .populate('post')
      .populate('reel');

    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership
    if (notification.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    notification.read = true;
    await notification.save();

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, read: false },
      { $set: { read: true } }
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Check ownership
    if (notification.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await notification.deleteOne();

    res.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
};