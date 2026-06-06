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
    default: null,
    select: false
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
  emailVerificationOtpHash: {
    type: String,
    default: null,
    select: false
  },
  emailVerificationOtpExpiresAt: {
    type: Date,
    default: null,
    select: false
  },
  emailVerificationAttempts: {
    type: Number,
    default: 0,
    select: false
  },
  passwordResetOtpHash: {
    type: String,
    default: null,
    select: false
  },
  passwordResetOtpExpiresAt: {
    type: Date,
    default: null,
    select: false
  },
  passwordResetAttempts: {
    type: Number,
    default: 0,
    select: false
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
  plan: { type: String, default: "trial" }, // "trial", "pro", "creator"
  role: { type: String, enum: ["user", "admin"], default: "user" },
  status: { type: String, enum: ["active", "suspended"], default: "active" },
  lastLoginAt: {
    type: Date,
    default: null
  },
  renewalDate: {
    type: Date,
    default: null
  },
  revenueContribution: {
    type: Number,
    default: 0
  },

  // Trial System
  generationsUsed: {
    type: Number,
    default: 0
  },
  generationLimit: {
    type: Number,
    default: 20
  },
  trialEndsAt: {
    type: Date,
    default: null
  },
  subscriptionStatus: {
    type: String,
    enum: ["active", "suspended", "cancelled"],
    default: "active"
  },

  // Session versioning for multi-device logout
  tokenVersion: {
    type: Number,
    default: 0
  },

  // Notifications Settings
  notifications: {
    emailAlerts: {
      type: Boolean,
      default: true
    },
    weeklyDigest: {
      type: Boolean,
      default: false
    }
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

UserSchema.index({ googleSub: 1 }, { unique: true, sparse: true });

// Virtual getter "name" that returns firstName + " " + lastName trimmed
UserSchema.virtual("name").get(function () {
  return `${this.firstName || ""} ${this.lastName || ""}`.trim();
});

module.exports = mongoose.model("User", UserSchema);
