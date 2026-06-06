const express = require("express");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const { requireApiAuth, COOKIE_NAME, publicUser } = require("../services/auth/session");

const router = express.Router();

// Multer in-memory upload config (max 5MB avatar images)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Password strength validator matching client/auth rules
const isStrongPassword = (password) => {
  const value = String(password || "");
  return value.length >= 10 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value);
};

/**
 * POST /api/user/update-profile
 * Updates name and notifications preferences.
 */
router.post("/api/user/update-profile", requireApiAuth, async (req, res) => {
  try {
    const { firstName, lastName, emailAlerts, weeklyDigest } = req.body;

    if (!firstName || !firstName.trim()) {
      return res.status(400).json({ error: "First name is required." });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found." });

    user.firstName = firstName.trim().slice(0, 60);
    user.lastName = (lastName || "").trim().slice(0, 60);
    
    user.notifications = {
      emailAlerts: emailAlerts === true || emailAlerts === 'true',
      weeklyDigest: weeklyDigest === true || weeklyDigest === 'true'
    };

    await user.save();
    res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    console.error("[User API] Update profile error:", err.message);
    res.status(500).json({ error: "Failed to update profile settings." });
  }
});

/**
 * POST /api/user/upload-avatar
 * Receives raw image upload, resizes using sharp to WebP format, saves locally, and saves the relative URL.
 */
router.post("/api/user/upload-avatar", requireApiAuth, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided." });
    }

    // Ensure upload directory exists
    const uploadDir = path.join(__dirname, "../uploads/avatars");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filename = `${req.user._id}-${Date.now()}.webp`;
    const outputPath = path.join(uploadDir, filename);

    // Process and crop image using sharp to a clean, square 150x150 WebP image
    await sharp(req.file.buffer)
      .resize(150, 150, { fit: "cover", position: "center" })
      .toFormat("webp")
      .toFile(outputPath);

    // Save public relative URL in user profile
    const avatarUrl = `/uploads/avatars/${filename}`;
    const user = await User.findById(req.user._id);
    user.avatar = avatarUrl;
    await user.save();

    res.json({ success: true, avatarUrl, user: publicUser(user) });
  } catch (err) {
    console.error("[User API] Upload avatar error:", err.message);
    res.status(500).json({ error: "Failed to upload and process profile image." });
  }
});

/**
 * POST /api/user/change-password
 * Checks current password and hashes new password. Increments tokenVersion.
 */
router.post("/api/user/change-password", requireApiAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Required fields missing." });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        error: "Password must be at least 10 characters and include uppercase, lowercase, number, and symbol."
      });
    }

    const user = await User.findById(req.user._id).select("+password");
    if (!user) return res.status(404).json({ error: "User not found." });

    // Validate current password
    if (user.password) {
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: "Incorrect current password." });
      }
    }

    // Securely hash and update the password
    user.password = await bcrypt.hash(newPassword, 12);
    user.tokenVersion += 1; // Invalidate other sessions
    await user.save();

    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    console.error("[User API] Change password error:", err.message);
    res.status(500).json({ error: "Failed to update password." });
  }
});

/**
 * POST /api/user/logout-all
 * Invalidates all sessions by incrementing tokenVersion, and clears active session cookie.
 */
router.post("/api/user/logout-all", requireApiAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.tokenVersion += 1;
      await user.save();
    }

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });

    res.json({ success: true, message: "Logged out from all devices." });
  } catch (err) {
    console.error("[User API] Logout all error:", err.message);
    res.status(500).json({ error: "Failed to logout from all devices." });
  }
});

/**
 * POST /api/user/delete-account
 * Deletes user profile, clears active session cookie.
 */
router.post("/api/user/delete-account", requireApiAuth, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);

    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });

    res.json({ success: true, message: "Account successfully deleted." });
  } catch (err) {
    console.error("[User API] Delete account error:", err.message);
    res.status(500).json({ error: "Failed to delete account." });
  }
});

/**
 * POST /api/user/upgrade
 * Upgrades the plan and sets appropriate generation limits in MongoDB.
 */
router.post("/api/user/upgrade", requireApiAuth, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!["pro", "creator", "trial"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan selected." });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found." });

    user.plan = plan;
    user.generationsUsed = 0; // Reset usage on plan change
    user.subscriptionStatus = "active";

    if (plan === "pro") {
      user.generationLimit = 250;
      user.trialEndsAt = null;
      user.renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    } else if (plan === "creator") {
      user.generationLimit = 1000;
      user.trialEndsAt = null;
      user.renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    } else {
      user.generationLimit = 20;
      user.trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      user.renewalDate = null;
    }

    await user.save();
    res.json({ success: true, user: publicUser(user) });
  } catch (err) {
    console.error("[User API] Upgrade plan error:", err.message);
    res.status(500).json({ error: "Failed to upgrade subscription plan." });
  }
});

module.exports = router;
