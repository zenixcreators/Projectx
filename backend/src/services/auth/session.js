const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../../models/User");

const SESSION_SECRET = process.env.SESSION_SECRET;
const COOKIE_NAME = "aurora_token";

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error("SESSION_SECRET must be set to a strong random value of at least 32 characters.");
}


/**
 * Signs a JWT and sets it as an HTTP-only cookie on the response
 * @param {object} user 
 * @param {object} res 
 * @returns {string} The signed token
 */
const generateToken = (user, res) => {
  const token = jwt.sign(
    { id: String(user._id), version: user.tokenVersion || 0 },
    SESSION_SECRET,
    { expiresIn: "7d" }
  );

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return token;
};

/**
 * API Authentication Middleware
 * Checks for a valid JWT and matches it to a User in MongoDB
 */
const requireApiAuth = async (req, res, next) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, SESSION_SECRET);

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: "Database connection offline. Please try again later." });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.status !== "active" || user.tokenVersion !== decoded.version) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Not authenticated" });
  }
};

/**
 * Page/Routing Authentication Middleware
 * Redirects to /login if session is missing or invalid
 */
const requirePageAuth = async (req, res, next) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.redirect("/login");
  }

  try {
    const decoded = jwt.verify(token, SESSION_SECRET);

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).send("Database connection offline. Please try again later.");
    }

    const user = await User.findById(decoded.id);
    if (!user || user.status !== "active" || user.tokenVersion !== decoded.version) {
      return res.redirect("/login");
    }

    req.user = user;
    next();
  } catch (err) {
    return res.redirect("/login");
  }
};

/**
 * Admin API Authentication Middleware
 * Confirms user is authenticated AND has role === 'admin'
 */
const requireAdmin = async (req, res, next) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const decoded = jwt.verify(token, SESSION_SECRET);

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ error: "Database connection offline. Please try again later." });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.status !== "active" || user.tokenVersion !== decoded.version) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (user.role !== "admin") {
      return res.status(403).json({ error: "Access denied: Admins only" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Not authenticated" });
  }
};

/**
 * Sanitizes a Mongoose user document for public/frontend consumption
 * @param {object} user 
 * @returns {object} Plain sanitized object
 */
const publicUser = (user) => {
  if (!user) return null;
  return {
    id: user.id || String(user._id),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name, // virtual getter
    avatar: user.avatar,
    plan: user.plan,
    role: user.role,
    onboardingDone: user.onboardingDone,
    creatorType: user.creatorType,
    emailVerified: user.emailVerified,
    generationsUsed: user.generationsUsed || 0,
    generationLimit: user.generationLimit || 20,
    trialEndsAt: user.trialEndsAt || null,
    subscriptionStatus: user.subscriptionStatus || "active",
    notifications: user.notifications || { emailAlerts: true, weeklyDigest: false },
    renewalDate: user.renewalDate || null,
    createdAt: user.createdAt
  };
};

module.exports = {
  COOKIE_NAME,
  generateToken,
  requireApiAuth,
  requirePageAuth,
  requireAdmin,
  publicUser
};
