const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  name: {
    type: String,
    trim: true,
    maxlength: 120,
    default: ""
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    maxlength: 180,
    default: ""
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  category: {
    type: String,
    required: true,
    trim: true,
    enum: ["bug", "feature", "love", "other"],
    default: "other"
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 3000
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, { collection: "feedback" });

module.exports = mongoose.model("Feedback", FeedbackSchema);
