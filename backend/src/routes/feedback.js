const express = require("express");
const mongoose = require("mongoose");
const Feedback = require("../models/Feedback");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();
const SESSION_SECRET = process.env.SESSION_SECRET;
const COOKIE_NAME = "creo_token";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/feedback
 * Submit customer feedback (supports anonymous and authenticated submissions)
 */
router.post("/api/feedback", async (req, res) => {
  try {
    const { category, rating, message } = req.body || {};

    let name = req.body.name || "";
    let email = req.body.email || "";
    let userId = null;

    // Optional authentication check via session cookie
    const token = req.cookies && req.cookies[COOKIE_NAME];
    if (token && SESSION_SECRET) {
      try {
        const decoded = jwt.verify(token, SESSION_SECRET);
        if (mongoose.connection.readyState === 1) {
          const user = await User.findById(decoded.id);
          if (user && user.status === "active" && user.tokenVersion === decoded.version) {
            userId = user._id;
            email = user.email;
            name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
          }
        }
      } catch (jwtErr) {
        // Ignore invalid token, fallback to provided parameters
      }
    }

    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Feedback message content is required." });
    }

    const validCategories = ["bug", "feature", "love", "other"];
    const cleanCategory = validCategories.includes(category) ? category : "other";
    const cleanMessage = message.trim().slice(0, 3000);
    
    let cleanRating = null;
    if (rating !== undefined && rating !== null) {
      const parsedRating = parseInt(rating, 10);
      if (!isNaN(parsedRating) && parsedRating >= 1 && parsedRating <= 5) {
        cleanRating = parsedRating;
      }
    }

    let cleanName = name.trim().slice(0, 120);
    let cleanEmail = email.trim().toLowerCase().slice(0, 180);

    // If anonymous, validate email format if provided
    if (!userId && cleanEmail) {
      if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: "Please provide a valid email address." });
      }
    }

    if (mongoose.connection.readyState !== 1) {
      console.warn("MongoDB is offline during feedback submission. Simulating success.");
      return res.status(200).json({
        success: true,
        message: "Feedback received successfully (offline dev fallback active)."
      });
    }

    const feedbackSubmission = new Feedback({
      userId,
      name: cleanName || (userId ? undefined : "Anonymous"),
      email: cleanEmail || undefined,
      rating: cleanRating,
      category: cleanCategory,
      message: cleanMessage
    });

    await feedbackSubmission.save();
    return res.status(200).json({
      success: true,
      message: "Thank you for your feedback!"
    });

  } catch (err) {
    console.error("[Feedback API] Submission error:", err.message);
    return res.status(500).json({ error: "Failed to submit feedback. Please try again later." });
  }
});

module.exports = router;
