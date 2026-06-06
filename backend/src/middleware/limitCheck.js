const User = require("../models/User");

/**
 * Middleware to check user's plan limits and trial status before AI generations.
 */
const checkLimit = async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Admins bypass limit checks
    if (user.role === "admin") {
      return next();
    }

    if (user.subscriptionStatus !== "active") {
      return res.status(403).json({
        error: "Your subscription is suspended or inactive. Please update your billing status.",
        code: "LIMIT_REACHED"
      });
    }

    // Trial validation checks
    if (user.plan === "trial") {
      const now = new Date();
      if (user.trialEndsAt && now > new Date(user.trialEndsAt)) {
        return res.status(403).json({
          error: "Your 7-day trial period has expired. Please upgrade your plan to unlock unlimited generations.",
          code: "LIMIT_REACHED"
        });
      }
    }

    if (user.generationsUsed >= user.generationLimit) {
      return res.status(403).json({
        error: `You have reached your limit of ${user.generationLimit} generations. Please upgrade to continue generating.`,
        code: "LIMIT_REACHED"
      });
    }

    next();
  } catch (err) {
    console.error("[LimitCheck Middleware] Error:", err.message);
    res.status(500).json({ error: "Failed to verify generation limits. Please try again." });
  }
};

/**
 * Utility function to increment the generationsUsed count for a user in MongoDB.
 */
const incrementGenerations = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, { $inc: { generationsUsed: 1 } });
    console.log(`[LimitCheck] Successfully incremented generations count for user: ${userId}`);
  } catch (err) {
    console.error("[LimitCheck Middleware] Failed to increment generations count:", err.message);
  }
};

/**
 * Post-response middleware to automatically increment generations count upon successful response (2xx).
 */
const incrementOnSuccess = (req, res, next) => {
  const originalEnd = res.end;
  let incremented = false;

  res.end = function () {
    if (!incremented && res.statusCode >= 200 && res.statusCode < 300 && req.user && req.user._id) {
      incremented = true;
      incrementGenerations(req.user._id);
    }
    return originalEnd.apply(this, arguments);
  };

  next();
};

module.exports = {
  checkLimit,
  incrementGenerations,
  incrementOnSuccess
};
