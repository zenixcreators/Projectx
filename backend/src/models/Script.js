const mongoose = require("mongoose");

const ScriptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  type: {
    type: String,
    enum: ["long", "short"],
    required: true
  },
  topic: {
    type: String,
    required: true
  },
  tone: {
    type: String,
    required: true
  },
  platform: {
    type: String,
    default: null // null for long-form
  },
  targetDuration: {
    type: String,
    default: null // null for short-form
  },
  scriptContent: {
    type: String,
    required: true
  },
  wordCount: {
    type: Number,
    required: true
  },
  estimatedDuration: {
    type: String,
    required: true
  },
  inputs: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Script", ScriptSchema);
