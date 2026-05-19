const mongoose = require("mongoose");

const ChannelReportSchema = new mongoose.Schema({
  channelId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  channelName: {
    type: String,
    required: true
  },
  channelUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String
  },
  description: {
    type: String
  },
  analysedAt: {
    type: Date,
    default: Date.now
  },
  requestedBy: {
    type: String, // Maps to the unique UUID from users.json
    required: true,
    index: true
  },
  healthScore: {
    type: Number,
    required: true
  },
  growthPhase: {
    type: String,
    required: true,
    enum: ["exploding", "growing", "stable", "declining"]
  },
  niche: {
    type: String,
    required: true
  },
  nicheSpecificity: {
    type: String,
    required: true,
    enum: ["Very High", "High", "Medium", "Low"]
  },
  summary: {
    type: String,
    required: true
  },
  stats: {
    subscribers: { type: Number, default: 0 },
    totalViews: { type: Number, default: 0 },
    videoCount: { type: Number, default: 0 },
    joinedYear: { type: Number },
    country: { type: String }
  },
  metrics: {
    viewVelocity: { type: Number, default: 1.0 },
    avgViewsPerVideo: { type: Number, default: 0 },
    avgEngagementRate: { type: Number, default: 0 },
    likeToViewRatio: { type: Number, default: 0 },
    commentToViewRatio: { type: Number, default: 0 },
    uploadsPerWeek: { type: Number, default: 0 },
    avgVideoDurationMinutes: { type: Number, default: 0 },
    uploadSchedule: { type: String, default: "Sporadic" },
    bestPerformingLength: { type: String, default: "Mid-form" },
    topKeywords: [{ type: String }],
    totalVideosAnalysed: { type: Number, default: 0 },
    estMinMonthlyRevenue: { type: Number, default: 0 },
    estMaxMonthlyRevenue: { type: Number, default: 0 }
  },
  contentDNA: {
    dominantTopics: [{ type: String }],
    titlePatterns: { type: String }
  },
  engagementQuality: {
    rating: { type: String, required: true },
    benchmark: { type: String },
    notes: { type: String }
  },
  topVideos: [{
    videoId: { type: String },
    title: { type: String },
    views: { type: Number },
    likes: { type: Number },
    comments: { type: Number },
    publishedAt: { type: Date },
    url: { type: String },
    thumbnailUrl: { type: String }
  }],
  contentGaps: [{
    type: String
  }],
  competitorThreatLevel: {
    type: String,
    required: true,
    enum: ["High", "Medium", "Low"]
  },
  threatReasoning: {
    type: String,
    required: true
  },
  recommendations: [{
    priority: { type: String, enum: ["High", "Medium", "Low"] },
    action: { type: String, required: true },
    why: { type: String }
  }],
  hookStrategy: {
    type: String
  },
  thumbnailStrategy: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("ChannelReport", ChannelReportSchema);
