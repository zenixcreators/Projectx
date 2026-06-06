const mongoose = require("mongoose");

const ContactSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    maxlength: 180
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
});

module.exports = mongoose.model("Contact", ContactSchema);
