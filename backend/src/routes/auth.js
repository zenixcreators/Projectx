const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { sendPasswordResetOtp, sendVerificationOtp } = require("../services/auth/email");
const { COOKIE_NAME, generateToken, publicUser, requireApiAuth } = require("../services/auth/session");
const jwt = require("jsonwebtoken");

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const TRUSTED_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "proton.me",
  "protonmail.com",
  "pm.me"
]);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please wait 15 minutes and try again." }
});

const normalizeEmail = (email) => String(email || "").toLowerCase().trim();

const getEmailDomain = (email) => {
  const parts = normalizeEmail(email).split("@");
  return parts.length === 2 ? parts[1] : "";
};

const isValidTrustedEmail = (email) => {
  const normalizedEmail = normalizeEmail(email);
  const domain = getEmailDomain(normalizedEmail);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) && TRUSTED_EMAIL_DOMAINS.has(domain);
};

const isStrongPassword = (password) => {
  const value = String(password || "");
  return value.length >= 10 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value);
};

const cleanName = (value) => String(value || "")
  .trim()
  .replace(/\s+/g, " ")
  .slice(0, 60);

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_PEPPER = process.env.SESSION_SECRET || "creo-dev-otp-pepper";

const createOtp = () => String(crypto.randomInt(100000, 1000000));

const hashOtp = (email, otp) => crypto
  .createHash("sha256")
  .update(`${normalizeEmail(email)}:${String(otp)}:${OTP_PEPPER}`)
  .digest("hex");

const attachVerificationOtp = (user, otp) => {
  user.emailVerificationOtpHash = hashOtp(user.email, otp);
  user.emailVerificationOtpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  user.emailVerificationAttempts = 0;
};

const attachPasswordResetOtp = (user, otp) => {
  user.passwordResetOtpHash = hashOtp(user.email, otp);
  user.passwordResetOtpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
  user.passwordResetAttempts = 0;
};

const requireDatabase = (res) => {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({ error: "Database is currently unavailable. Please try again shortly." });
    return false;
  }
  return true;
};

router.use([
  "/auth/signup",
  "/auth/login",
  "/auth/admin/login",
  "/auth/google",
  "/auth/verify-email",
  "/auth/resend-otp",
  "/auth/forgot-password",
  "/auth/reset-password"
], authLimiter);

/**
 * GET /auth/config
 * Provides public configuration
 */
router.get("/auth/config", (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || "" });
});

/**
 * POST /auth/signup
 * Handles local user registration with password hashing and MongoDB storage
 */
router.post("/auth/signup", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    if (!requireDatabase(res)) return;

    const normalizedEmail = normalizeEmail(email);
    if (!isValidTrustedEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Use a trusted Google, Outlook, or Proton Mail address." });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        error: "Password must be at least 10 characters and include uppercase, lowercase, number, and symbol."
      });
    }

    const safeFirstName = cleanName(firstName);
    const safeLastName = cleanName(lastName);
    if (!safeFirstName) {
      return res.status(400).json({ error: "First name is required" });
    }

    const existingUser = await User.findOne({ email: normalizedEmail }).select("+emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationAttempts");
    if (existingUser) {
      if (existingUser.emailVerified) {
        return res.status(400).json({ error: "User already exists. Please log in." });
      }

      existingUser.password = await bcrypt.hash(password, 12);
      existingUser.firstName = safeFirstName;
      existingUser.lastName = safeLastName;
      existingUser.signupIp = req.ip;

      const otp = createOtp();
      attachVerificationOtp(existingUser, otp);
      await existingUser.save();
      const delivery = await sendVerificationOtp({ email: normalizedEmail, firstName: safeFirstName, otp });

      return res.status(200).json({
        pendingVerification: true,
        email: normalizedEmail,
        message: delivery.devMode
          ? "Verification code created. SMTP is not configured, so check the server console for the OTP."
          : "Verification code sent. Please check your email."
      });
    }

    // Hash the password securely with standard bcrypt strength
    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = createOtp();

    const user = new User({
      email: normalizedEmail,
      password: hashedPassword,
      firstName: safeFirstName,
      lastName: safeLastName,
      emailVerified: false,
      signupIp: req.ip,
      plan: "trial",
      generationsUsed: 0,
      generationLimit: 20,
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      subscriptionStatus: "active"
    });
    attachVerificationOtp(user, otp);
    await user.save();
    const delivery = await sendVerificationOtp({ email: normalizedEmail, firstName: safeFirstName, otp });

    res.status(201).json({
      pendingVerification: true,
      email: normalizedEmail,
      user: publicUser(user),
      message: delivery.devMode
        ? "Account created. SMTP is not configured, so check the server console for the OTP."
        : "Verification code sent. Please check your email."
    });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * POST /auth/verify-email
 * Verifies the local signup OTP and starts the session
 */
router.post("/auth/verify-email", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const cleanOtp = String(otp || "").trim();

    if (!normalizedEmail || !/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ error: "Enter the 6-digit verification code." });
    }

    if (!requireDatabase(res)) return;

    const user = await User.findOne({ email: normalizedEmail })
      .select("+emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationAttempts");

    if (!user || user.status !== "active") {
      return res.status(401).json({ error: "Verification failed." });
    }

    if (user.emailVerified) {
      generateToken(user._id, res);
      return res.json({ user: publicUser(user), message: "Email already verified." });
    }

    if (!user.emailVerificationOtpHash || !user.emailVerificationOtpExpiresAt || user.emailVerificationOtpExpiresAt < new Date()) {
      return res.status(400).json({ error: "Verification code expired. Request a new code." });
    }

    if (user.emailVerificationAttempts >= 5) {
      return res.status(429).json({ error: "Too many wrong codes. Request a new code." });
    }

    const expectedHash = hashOtp(normalizedEmail, cleanOtp);
    if (expectedHash !== user.emailVerificationOtpHash) {
      user.emailVerificationAttempts += 1;
      await user.save();
      return res.status(401).json({ error: "Incorrect verification code." });
    }

    user.emailVerified = true;
    user.emailVerificationOtpHash = null;
    user.emailVerificationOtpExpiresAt = null;
    user.emailVerificationAttempts = 0;
    user.lastLoginAt = new Date();
    await user.save();

    generateToken(user._id, res);
    res.json({ user: publicUser(user), message: "Email verified. Welcome to Creo." });
  } catch (err) {
    console.error("Email verification error:", err.message);
    res.status(500).json({ error: "Email verification failed" });
  }
});

/**
 * POST /auth/resend-otp
 * Sends a fresh verification OTP to an unverified local account
 */
router.post("/auth/resend-otp", async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    if (!isValidTrustedEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Use a trusted Google, Outlook, or Proton Mail address." });
    }

    if (!requireDatabase(res)) return;

    const user = await User.findOne({ email: normalizedEmail })
      .select("+emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationAttempts");

    if (!user || user.status !== "active") {
      return res.status(404).json({ error: "Account not found." });
    }

    if (user.emailVerified) {
      return res.status(400).json({ error: "Email is already verified. Please log in." });
    }

    const otp = createOtp();
    attachVerificationOtp(user, otp);
    await user.save();
    const delivery = await sendVerificationOtp({ email: normalizedEmail, firstName: user.firstName, otp });

    res.json({
      pendingVerification: true,
      email: normalizedEmail,
      message: delivery.devMode
        ? "New verification code created. SMTP is not configured, so check the server console for the OTP."
        : "New verification code sent. Please check your email."
    });
  } catch (err) {
    console.error("Resend OTP error:", err.message);
    res.status(500).json({ error: "Could not resend verification code." });
  }
});

/**
 * POST /auth/forgot-password
 * Sends a password reset OTP without revealing whether an account exists
 */
router.post("/auth/forgot-password", async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    if (!isValidTrustedEmail(normalizedEmail)) {
      return res.status(400).json({ error: "Use a trusted Google, Outlook, or Proton Mail address." });
    }

    if (!requireDatabase(res)) return;

    const genericMessage = "If an account exists for this email, a password reset code has been sent.";
    const user = await User.findOne({ email: normalizedEmail })
      .select("+passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetAttempts");

    if (!user || user.status !== "active") {
      return res.json({ email: normalizedEmail, message: genericMessage });
    }

    const otp = createOtp();
    attachPasswordResetOtp(user, otp);
    await user.save();
    const delivery = await sendPasswordResetOtp({ email: normalizedEmail, firstName: user.firstName, otp });

    res.json({
      email: normalizedEmail,
      message: delivery.devMode
        ? "Password reset code created. SMTP is not configured, so check the server console for the OTP."
        : genericMessage
    });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ error: "Could not start password reset." });
  }
});

/**
 * POST /auth/reset-password
 * Verifies reset OTP and stores a new password hash
 */
router.post("/auth/reset-password", async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const cleanOtp = String(req.body.otp || "").trim();
    const newPassword = String(req.body.password || "");

    if (!isValidTrustedEmail(normalizedEmail) || !/^\d{6}$/.test(cleanOtp)) {
      return res.status(400).json({ error: "Enter a valid email and 6-digit reset code." });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        error: "Password must be at least 10 characters and include uppercase, lowercase, number, and symbol."
      });
    }

    if (!requireDatabase(res)) return;

    const user = await User.findOne({ email: normalizedEmail })
      .select("+password +passwordResetOtpHash +passwordResetOtpExpiresAt +passwordResetAttempts");

    if (!user || user.status !== "active") {
      return res.status(401).json({ error: "Password reset failed." });
    }

    if (!user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt || user.passwordResetOtpExpiresAt < new Date()) {
      return res.status(400).json({ error: "Reset code expired. Request a new code." });
    }

    if (user.passwordResetAttempts >= 5) {
      return res.status(429).json({ error: "Too many wrong codes. Request a new code." });
    }

    const expectedHash = hashOtp(normalizedEmail, cleanOtp);
    if (expectedHash !== user.passwordResetOtpHash) {
      user.passwordResetAttempts += 1;
      await user.save();
      return res.status(401).json({ error: "Incorrect reset code." });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.emailVerified = true;
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpiresAt = null;
    user.passwordResetAttempts = 0;
    user.emailVerificationOtpHash = null;
    user.emailVerificationOtpExpiresAt = null;
    user.emailVerificationAttempts = 0;
    user.lastLoginAt = new Date();
    await user.save();

    generateToken(user._id, res);
    res.json({ user: publicUser(user), message: "Password reset successfully. Redirecting..." });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(500).json({ error: "Password reset failed." });
  }
});

/**
 * POST /auth/login
 * Handles local user authentication and JWT generation
 */
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    if (!requireDatabase(res)) return;

    const normalizedEmail = normalizeEmail(email);
    if (!isValidTrustedEmail(normalizedEmail)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    
    if (!user || !user.password || user.status !== "active") {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ error: "Please verify your email before logging in.", pendingVerification: true, email: normalizedEmail });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    user.lastLoginAt = new Date();
    await user.save();

    generateToken(user._id, res);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * POST /auth/admin/login
 * Handles administrative portal authentication and JWT generation
 */
router.post("/auth/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    if (!requireDatabase(res)) return;

    const normalizedEmail = normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    
    if (!user || !user.password || user.status !== "active") {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Strict role validation
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Access denied: Not an administrator" });
    }

    user.lastLoginAt = new Date();
    await user.save();

    generateToken(user._id, res);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("Admin login error:", err.message);
    res.status(500).json({ error: "Login failed" });
  }
});

/**
 * POST /auth/google
 * Handles Google One Tap / OAuth2 credential verification via Google libraries
 */
router.post("/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Credential is required" });
    }

    // Verify token strictly with official Google OAuth library
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      throw new Error("Invalid token payload or missing email");
    }

    const { sub, email, given_name, family_name, picture, email_verified } = payload;
    const normalizedEmail = normalizeEmail(email);

    if (!email_verified) {
      return res.status(401).json({ error: "Google email must be verified before signing in." });
    }

    if (!isValidTrustedEmail(normalizedEmail) || !["gmail.com", "googlemail.com"].includes(getEmailDomain(normalizedEmail))) {
      return res.status(401).json({ error: "Google sign-in requires a verified Gmail or Googlemail address." });
    }

    // Verify database connection is active
    if (!requireDatabase(res)) return;

    let user = await User.findOne({ googleSub: sub });

    if (!user) {
      // Try to link Google profile to existing email account
      user = await User.findOne({ email: normalizedEmail });
      if (user) {
        if (user.status !== "active") {
          return res.status(403).json({ error: "This account is not active." });
        }
        user.googleSub = sub;
        if (given_name && !user.firstName) user.firstName = given_name;
        if (family_name && !user.lastName) user.lastName = family_name;
        if (picture && !user.avatar) user.avatar = picture;
        user.emailVerified = email_verified || user.emailVerified;
        await user.save();
      }
    }

    if (!user) {
      // Create new user profile for Google login
      user = await User.create({
        email: normalizedEmail,
        googleSub: sub,
        firstName: given_name || "",
        lastName: family_name || "",
        avatar: picture || null,
        emailVerified: !!email_verified,
        password: null,
        plan: "trial",
        generationsUsed: 0,
        generationLimit: 20,
        trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        subscriptionStatus: "active"
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({ error: "This account is not active." });
    }

    user.lastLoginAt = new Date();
    await user.save();

    generateToken(user._id, res);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("Google auth error:", err.message, err.stack);
    // Distinguish DB errors from Google token errors
    if (
      err.message.includes("Database offline") ||
      err.name === "MongoNetworkError" ||
      err.name === "MongoServerError" ||
      err.message.includes("buffering timed out") ||
      err.message.includes("connection") ||
      err.message.includes("ECONNREFUSED")
    ) {
      return res.status(503).json({ error: "Database is currently unavailable. Please try again shortly." });
    }
    res.status(401).json({ error: "Google authentication failed. Please try again." });
  }
});

/**
 * GET /auth/me
 * Returns sanitized current authenticated user info (returns null instead of 401 if unauthenticated)
 */
router.get("/auth/me", async (req, res) => {
  try {
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (token && process.env.SESSION_SECRET) {
      const decoded = jwt.verify(token, process.env.SESSION_SECRET);
      if (mongoose.connection.readyState === 1) {
        const user = await User.findById(decoded.id);
        if (user && user.status === "active" && user.tokenVersion === decoded.version) {
          return res.json({ user: publicUser(user) });
        }
      }
    }
  } catch (err) {
    // Ignore verification errors
  }
  res.json({ user: null });
});

/**
 * POST /auth/logout
 * Evicts active session cookie
 */
router.post("/auth/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  res.json({ success: true });
});

/**
 * POST /auth/onboarding
 * Protected onboarding route to persist creator preferences
 */
router.post("/auth/onboarding", requireApiAuth, async (req, res) => {
  try {
    const { creatorType, tone, preferredLanguage } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        creatorType,
        tone,
        preferredLanguage,
        onboardingDone: true
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Onboarding error:", err.message);
    res.status(500).json({ error: "Failed to save onboarding settings" });
  }
});

module.exports = router;
