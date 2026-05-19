const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  // Identity
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    default: null
  },
  googleSub: {
    type: String,
    default: null,
    sparse: true
  },
  firstName: {
    type: String,
    default: ""
  },
  lastName: {
    type: String,
    default: ""
  },
  avatar: {
    type: String,
    default: null
  },

  // Verification
  emailVerified: {
    type: Boolean,
    default: false
  },

  // Onboarding
  creatorType: {
    type: String,
    default: null
  },
  tone: {
    type: String,
    default: null
  },
  preferredLanguage: {
    type: String,
    default: "en"
  },
  onboardingDone: {
    type: Boolean,
    default: false
  },

  // Subscription
  plan: { type: String, enum: ["free", "pro"], default: "free" },
  role: { type: String, enum: ["user", "admin"], default: "user" },

  // Trial (for 7-day trial system — add now, activate later)
  trialStartedAt: {
    type: Date,
    default: null
  },
  trialUsed: {
    type: Boolean,
    default: false
  },

  // Abuse prevention fingerprints (add now, activate later)
  deviceFingerprint: {
    type: String,
    default: null
  },
  signupIp: {
    type: String,
    default: null
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual getter "name" that returns firstName + " " + lastName trimmed
UserSchema.virtual("name").get(function () {
  return `${this.firstName || ""} ${this.lastName || ""}`.trim();
});

module.exports = mongoose.model("User", UserSchema);
