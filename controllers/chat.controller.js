const Message = require('../models/Message');
const User = require('../models/User');

// @desc    Send a message
// @route   POST /api/chat/send
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.id;

    if (senderId === receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send message to yourself'
      });
    }

    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({
        success: false,
        message: 'Receiver not found'
      });
    }

    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      content
    });

    // Populate sender and receiver details
    await message.populate('sender', 'username avatar');
    await message.populate('receiver', 'username avatar');

    res.status(201).json({
      success: true,
      message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get messages between users
// @route   GET /api/chat/:userId
// @access  Private
const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId }
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender', 'username avatar')
    .populate('receiver', 'username avatar');

    res.json({
      success: true,
      messages
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all conversations for current user
// @route   GET /api/chat/conversations
// @access  Private
const getConversations = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get distinct conversations
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }]
    })
    .sort({ createdAt: -1 })
    .populate('sender', 'username avatar')
    .populate('receiver', 'username avatar');

    // Group by conversation partner
    const conversations = {};
    messages.forEach(message => {
      const partnerId = message.sender._id.toString() === userId 
        ? message.receiver._id.toString()
        : message.sender._id.toString();
      
      if (!conversations[partnerId]) {
        conversations[partnerId] = {
          user: message.sender._id.toString() === userId ? message.receiver : message.sender,
          lastMessage: message,
          unreadCount: 0
        };
      }
    });

    res.json({
      success: true,
      conversations: Object.values(conversations)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Mark messages as read
// @route   PUT /api/chat/read/:userId
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    await Message.updateMany(
      {
        sender: userId,
        receiver: currentUserId,
        read: false
      },
      {
        $set: { read: true, readAt: Date.now() }
      }
    );

    res.json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getConversations,
  markAsRead
};