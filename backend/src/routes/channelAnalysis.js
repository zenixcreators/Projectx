const express = require("express");
const authMiddleware = require("../middleware/auth");
const channelAnalysisService = require("../services/channelAnalysisService");
const ChannelReport = require("../models/ChannelReport");

const router = express.Router();

/**
 * Helper to format SSE transmission
 */
function sendSSEEvent(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * POST /api/channel/analyze
 * Protected endpoint that streams parsing and AI analysis progress using Server-Sent Events (SSE)
 */
router.post("/analyze", authMiddleware, async (req, res) => {
  const { url, platform } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: "Channel identifier or handle is required." });
  }

  // Set headers for Server-Sent Events
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  let isConnectionActive = true;
  req.on("close", () => {
    isConnectionActive = false;
    console.log("Client closed analysis connection early.");
  });

  try {
    const reportData = await channelAnalysisService.orchestrateAnalysis(url, platform || "youtube", (progress) => {
      if (isConnectionActive) {
        sendSSEEvent(res, { type: "progress", ...progress });
      }
    });

    if (isConnectionActive) {
      let finalReport = reportData;
      try {
        // Upsert report to MongoDB cache with request user reference
        finalReport = await ChannelReport.findOneAndUpdate(
          { channelId: reportData.channelId },
          { ...reportData, requestedBy: req.user.id },
          { upsert: true, new: true }
        );
      } catch (dbErr) {
        console.warn("Database caching skipped (MongoDB is offline):", dbErr.message);
        finalReport = { ...reportData, _id: "temp_" + reportData.channelId };
      }

      sendSSEEvent(res, { type: "done", report: finalReport });
    }
  } catch (err) {
    console.error("Analysis route failure:", err.message);
    if (isConnectionActive) {
      sendSSEEvent(res, { type: "error", message: err.message || "An unexpected error occurred during analysis." });
    }
  } finally {
    res.end();
  }
});

/**
 * GET /api/channel/report/:channelId
 * Protected endpoint returning cached MongoDB channel analysis report
 */
router.get("/report/:channelId", authMiddleware, async (req, res) => {
  try {
    const report = await ChannelReport.findOne({ channelId: req.params.channelId });
    if (!report) {
      return res.status(404).json({ error: "Report not found. Generate it first!" });
    }
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve channel audit report." });
  }
});

/**
 * GET /api/channel/recent
 * Protected endpoint returning the last 10 audit reports created by this user
 */
router.get("/recent", authMiddleware, async (req, res) => {
  try {
    const recent = await ChannelReport.find({ requestedBy: req.user.id })
      .select("channelId channelName thumbnailUrl growthPhase healthScore niche analysedAt")
      .sort({ analysedAt: -1 })
      .limit(10);
    res.json(recent);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve recent analysis history." });
  }
});

module.exports = router;
