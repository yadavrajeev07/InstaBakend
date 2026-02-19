const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const UserSchema = new mongoose.Schema({
    email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  fullName: {
    type: String,
    required: [true, 'Please add a full name'],
    trim: true,
    maxlength: [50, 'Full name cannot be more than 50 characters']

  },

  username: {
    type: String,
    required: [true, 'Please add a username'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot be more than 30 characters']
  },
  
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  avatar: {
  type: String,
  default: "/default-avatar.png"
},

  avatarPublicId: {
    type: String
  },
  bio: {
    type: String,
    maxlength: [150, 'Bio cannot be more than 150 characters'],
    default: ''
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  reels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reel'
  }],
  resetPasswordToken: String,
  resetPasswordExpire: Date
}, {
  timestamps: true
});

// Encrypt password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next(); // ✅ RETURN
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
UserSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate password reset token
UserSchema.methods.getResetPasswordToken = function() {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Virtual for follower count
UserSchema.virtual('followerCount').get(function() {
  return this.followers.length;
});

// Virtual for following count
UserSchema.virtual('followingCount').get(function() {
  return this.following.length;
});

// Virtual for post count
UserSchema.virtual('postCount').get(function() {
  return this.posts.length;
});

// Virtual for reel count
UserSchema.virtual('reelCount').get(function() {
  return this.reels.length;
});

module.exports = mongoose.model('User', UserSchema);