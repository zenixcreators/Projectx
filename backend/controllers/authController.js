const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/auth/signup
const signup = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
    });

    if (user) {
      generateToken(res, user._id);
      res.status(201).json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        creatorType: user.creatorType,
        onboardingCompleted: user.onboardingCompleted,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      generateToken(res, user._id);
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        avatar: user.avatar,
        creatorType: user.creatorType,
        onboardingCompleted: user.onboardingCompleted,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
const logout = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  const user = {
    _id: req.user._id,
    firstName: req.user.firstName,
    lastName: req.user.lastName,
    email: req.user.email,
    avatar: req.user.avatar,
    creatorType: req.user.creatorType,
    onboardingCompleted: req.user.onboardingCompleted,
  };
  res.status(200).json(user);
};

// @desc    Update user onboarding status
// @route   PUT /api/auth/onboarding
const updateOnboarding = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.creatorType = req.body.creatorType || user.creatorType;
      user.preferredTone = req.body.preferredTone || user.preferredTone;
      user.primaryLanguage = req.body.primaryLanguage || user.primaryLanguage;
      user.onboardingCompleted = true;

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        creatorType: updatedUser.creatorType,
        onboardingCompleted: updatedUser.onboardingCompleted,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
};

module.exports = {
  signup,
  login,
  logout,
  getMe,
  updateOnboarding
};
