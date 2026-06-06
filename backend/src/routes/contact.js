const express = require("express");
const mongoose = require("mongoose");
const Contact = require("../models/Contact");

const router = express.Router();

// Simple email regex validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/contact
 * Public endpoint to submit customer support message
 */
router.post("/api/contact", async (req, res) => {
  try {
    const { name, email, message } = req.body || {};

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Name is required." });
    }
    if (!email || typeof email !== "string" || !emailRegex.test(email.trim())) {
      return res.status(400).json({ error: "A valid email address is required." });
    }
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message content is required." });
    }

    const cleanName = name.trim().slice(0, 120);
    const cleanEmail = email.trim().toLowerCase().slice(0, 180);
    const cleanMessage = message.trim().slice(0, 3000);

    if (mongoose.connection.readyState !== 1) {
      console.warn("MongoDB is offline (readyState !== 1) during contact submission. Simulating success.");
      return res.status(200).json({
        success: true,
        message: "Message received successfully (offline dev fallback active)."
      });
    }

    const contactSubmission = new Contact({
      name: cleanName,
      email: cleanEmail,
      message: cleanMessage
    });

    await contactSubmission.save();
    return res.status(200).json({
      success: true,
      message: "Message sent successfully! We will get back to you shortly."
    });

  } catch (err) {
    console.error("[Contact API] Submission error:", err.message);
    return res.status(500).json({ error: "Failed to submit message. Please try again later." });
  }
});

module.exports = router;
