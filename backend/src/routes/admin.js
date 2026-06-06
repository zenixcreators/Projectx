const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const { requireAdmin } = require("../services/auth/session");

const router = express.Router();
const DAY = 24 * 60 * 60 * 1000;
const PRO_PRICE = Number(process.env.PRO_PLAN_PRICE || 35.99);

const requireDatabase = (res) => {
  if (mongoose.connection.readyState === 1) return true;
  res.status(503).json({ error: "Database connection offline. Admin data is unavailable." });
  return false;
};

const asDate = (value) => (value ? new Date(value) : null);

const trialState = (user) => {
  const startedAt = asDate(user.trialStartedAt);
  if (!startedAt) {
    return {
      status: "none",
      startDate: null,
      endDate: null,
      remainingDays: null,
      progress: 0
    };
  }

  const endDate = new Date(startedAt.getTime() + 7 * DAY);
  const remainingMs = endDate.getTime() - Date.now();
  const remainingDays = Math.ceil(remainingMs / DAY);
  const elapsed = Math.max(0, Date.now() - startedAt.getTime());
  const progress = Math.min(100, Math.max(0, Math.round((elapsed / (7 * DAY)) * 100)));
  let status = "active";
  if (remainingDays < 0) status = "expired";
  else if (remainingDays === 0) status = "expires_today";
  else if (remainingDays <= 3) status = "expiring_soon";

  return {
    status,
    startDate: startedAt,
    endDate,
    remainingDays: Math.max(remainingDays, 0),
    progress
  };
};

const adminUserResponse = (user) => {
  if (!user) return null;
  const trial = trialState(user);
  return {
    id: user.id || user._id.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    name: user.name,
    avatar: user.avatar,
    plan: user.plan,
    role: user.role,
    status: user.status || "active",
    onboardingDone: user.onboardingDone,
    creatorType: user.creatorType,
    preferredLanguage: user.preferredLanguage,
    emailVerified: user.emailVerified,
    trialStartedAt: user.trialStartedAt,
    trialUsed: user.trialUsed,
    trial,
    deviceFingerprint: user.deviceFingerprint,
    signupIp: user.signupIp,
    lastLoginAt: user.lastLoginAt,
    renewalDate: user.renewalDate,
    revenueContribution: Number(user.revenueContribution || (user.plan === "pro" ? PRO_PRICE : 0)),
    createdAt: user.createdAt
  };
};

const makeSeries = (users, days, reducer) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    const next = new Date(date);
    next.setDate(date.getDate() + 1);
    const scoped = users.filter((user) => {
      const created = asDate(user.createdAt);
      return created && created >= date && created < next;
    });
    return {
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      date: date.toISOString(),
      value: reducer(scoped, date, next)
    };
  });
};

const growthPercent = (current, previous) => {
  if (!previous && current) return 100;
  if (!previous) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};

const buildDashboardPayload = async (rangeDays = 30) => {
  const users = await User.find({}).sort({ createdAt: -1 }).lean({ virtuals: true });
  const now = new Date();
  const rangeStart = new Date(now.getTime() - rangeDays * DAY);
  const previousStart = new Date(rangeStart.getTime() - rangeDays * DAY);

  const totalCreators = users.length;
  const paidUsers = users.filter((user) => user.plan === "pro").length;
  const freeUsers = users.filter((user) => user.plan !== "pro").length;
  const activeTrials = users.filter((user) => trialState(user).status === "active" || trialState(user).status === "expiring_soon" || trialState(user).status === "expires_today").length;
  const securityGroups = new Map();

  users.forEach((user) => {
    if (!user.signupIp) return;
    securityGroups.set(user.signupIp, (securityGroups.get(user.signupIp) || 0) + 1);
  });

  const securityAlerts = [...securityGroups.values()].filter((count) => count > 1).length;
  const revenueMtd = users.reduce((sum, user) => sum + Number(user.revenueContribution || (user.plan === "pro" ? PRO_PRICE : 0)), 0);
  const currentAdds = users.filter((user) => asDate(user.createdAt) >= rangeStart).length;
  const previousAdds = users.filter((user) => {
    const created = asDate(user.createdAt);
    return created && created >= previousStart && created < rangeStart;
  }).length;

  const dailySignups = makeSeries(users, rangeDays, (scoped) => scoped.length);
  let running = users.filter((user) => asDate(user.createdAt) < rangeStart).length;
  const userGrowth = dailySignups.map((point) => {
    running += point.value;
    return { ...point, value: running };
  });
  const revenueGrowth = makeSeries(users, rangeDays, (scoped) =>
    scoped.reduce((sum, user) => sum + Number(user.revenueContribution || (user.plan === "pro" ? PRO_PRICE : 0)), 0)
  );

  const conversionRate = totalCreators ? Number(((paidUsers / totalCreators) * 100).toFixed(1)) : 0;
  const trialUsers = users.filter((user) => user.trialStartedAt);
  const expiredTrials = trialUsers.filter((user) => trialState(user).status === "expired").length;
  const convertedTrials = trialUsers.filter((user) => user.plan === "pro").length;

  const notifications = [];
  users.slice(0, 6).forEach((user) => {
    notifications.push({
      id: `user-${user._id}`,
      type: "New User Registration",
      title: "New creator registered",
      message: `${user.firstName || user.email} joined the workspace.`,
      createdAt: user.createdAt,
      unread: true
    });
  });
  users.filter((user) => user.plan === "pro").slice(0, 5).forEach((user) => {
    notifications.push({
      id: `paid-${user._id}`,
      type: "New Paid Subscription",
      title: "Paid subscription active",
      message: `${user.firstName || user.email} is on Pro.`,
      createdAt: user.createdAt,
      unread: true
    });
  });
  users.filter((user) => ["expiring_soon", "expires_today", "expired"].includes(trialState(user).status)).slice(0, 8).forEach((user) => {
    const trial = trialState(user);
    notifications.push({
      id: `trial-${user._id}`,
      type: trial.status === "expired" ? "Trial Expired" : "Trial Expiring Soon",
      title: trial.status === "expired" ? "Trial expired" : "Trial window closing",
      message: `${user.firstName || user.email} has ${trial.remainingDays || 0} days remaining.`,
      createdAt: trial.endDate,
      unread: true
    });
  });
  [...securityGroups.entries()].filter(([, count]) => count > 1).forEach(([ip, count]) => {
    notifications.push({
      id: `security-${ip}`,
      type: "Security Alert",
      title: "Shared signup IP detected",
      message: `${count} creators registered from ${ip}.`,
      createdAt: now,
      unread: true
    });
  });

  return {
    stats: {
      totalCreators,
      paidUsers,
      freeUsers,
      activeTrials,
      revenueMtd: Number(revenueMtd.toFixed(2)),
      securityAlerts,
      conversionRate,
      userGrowthRate: growthPercent(currentAdds, previousAdds),
      paidGrowthRate: growthPercent(
        users.filter((user) => user.plan === "pro" && asDate(user.createdAt) >= rangeStart).length,
        users.filter((user) => {
          const created = asDate(user.createdAt);
          return user.plan === "pro" && created && created >= previousStart && created < rangeStart;
        }).length
      )
    },
    planDistribution: {
      paid: paidUsers,
      free: freeUsers,
      trial: activeTrials
    },
    trialFunnel: {
      started: trialUsers.length,
      active: activeTrials,
      converted: convertedTrials,
      expired: expiredTrials
    },
    charts: {
      userGrowth,
      dailySignups,
      revenueGrowth,
      subscriptionTrends: {
        labels: ["Free", "Paid", "Trial"],
        values: [freeUsers, paidUsers, activeTrials]
      }
    },
    notifications: notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 30)
  };
};

router.get("/api/admin/stats", requireAdmin, async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const days = Math.max(1, Math.min(365, Number(req.query.days || 30)));
    res.json(await buildDashboardPayload(days));
  } catch (err) {
    console.error("Admin stats aggregation error:", err.message);
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

router.get("/api/admin/users", requireAdmin, async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const {
      search = "",
      plan = "all",
      trial = "all",
      status = "all",
      page = 1,
      limit = 25,
      sort = "createdAt",
      direction = "desc"
    } = req.query;

    const query = {};
    const cleanSearch = String(search).trim();
    if (cleanSearch) {
      query.$or = [
        { email: new RegExp(cleanSearch, "i") },
        { firstName: new RegExp(cleanSearch, "i") },
        { lastName: new RegExp(cleanSearch, "i") },
        { signupIp: new RegExp(cleanSearch, "i") },
        { deviceFingerprint: new RegExp(cleanSearch, "i") }
      ];
    }
    if (plan !== "all") query.plan = String(plan).toLowerCase();
    if (status !== "all") query.status = String(status).toLowerCase();

    const users = await User.find(query).lean({ virtuals: true });
    const trialFiltered = trial === "all"
      ? users
      : users.filter((user) => trialState(user).status === trial);

    const allowedSorts = new Set(["createdAt", "lastLoginAt", "email", "plan", "status", "revenueContribution"]);
    const sortKey = allowedSorts.has(sort) ? sort : "createdAt";
    const sortDir = direction === "asc" ? 1 : -1;
    trialFiltered.sort((a, b) => {
      const left = a[sortKey] ?? "";
      const right = b[sortKey] ?? "";
      if (left > right) return sortDir;
      if (left < right) return -sortDir;
      return 0;
    });

    const safeLimit = Math.max(5, Math.min(100, Number(limit)));
    const safePage = Math.max(1, Number(page));
    const total = trialFiltered.length;
    const paged = trialFiltered.slice((safePage - 1) * safeLimit, safePage * safeLimit);

    res.json({
      users: paged.map(adminUserResponse),
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.max(1, Math.ceil(total / safeLimit))
      }
    });
  } catch (err) {
    console.error("Fetch admin users error:", err.message);
    res.status(500).json({ error: "Failed to fetch creators directory" });
  }
});

router.post("/api/admin/users", requireAdmin, async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const { email, firstName = "", lastName = "", plan = "free", role = "user", password } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const normalizedEmail = String(email).toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ error: "Creator already exists" });
    const hashedPassword = password ? await bcrypt.hash(password, 12) : null;
    const user = await User.create({
      email: normalizedEmail,
      firstName,
      lastName,
      password: hashedPassword,
      plan: ["free", "pro"].includes(String(plan).toLowerCase()) ? String(plan).toLowerCase() : "free",
      role: ["user", "admin"].includes(String(role).toLowerCase()) ? String(role).toLowerCase() : "user",
      revenueContribution: String(plan).toLowerCase() === "pro" ? PRO_PRICE : 0
    });
    res.status(201).json({ success: true, user: adminUserResponse(user) });
  } catch (err) {
    console.error("Create admin user error:", err.message);
    res.status(500).json({ error: "Failed to create creator profile" });
  }
});

router.put("/api/admin/users/:id", requireAdmin, async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const { firstName, lastName, email, plan, role, status, trialAction } = req.body;
    const updateData = {};

    if (typeof firstName === "string") updateData.firstName = firstName;
    if (typeof lastName === "string") updateData.lastName = lastName;
    if (email) updateData.email = String(email).toLowerCase().trim();
    if (plan && ["free", "pro"].includes(String(plan).toLowerCase())) {
      updateData.plan = String(plan).toLowerCase();
      updateData.revenueContribution = updateData.plan === "pro" ? PRO_PRICE : 0;
      updateData.renewalDate = updateData.plan === "pro" ? new Date(Date.now() + 30 * DAY) : null;
    }
    if (role && ["user", "admin"].includes(String(role).toLowerCase())) updateData.role = String(role).toLowerCase();
    if (status && ["active", "suspended"].includes(String(status).toLowerCase())) updateData.status = String(status).toLowerCase();

    if (trialAction === "start") {
      updateData.trialStartedAt = new Date();
      updateData.trialUsed = true;
    } else if (trialAction === "extend") {
      const user = await User.findById(req.params.id);
      if (user) {
        const currentEnd = user.trialStartedAt ? new Date(user.trialStartedAt.getTime() + 7 * DAY) : new Date();
        const extendedStart = new Date(Math.max(Date.now(), currentEnd.getTime()));
        updateData.trialStartedAt = new Date(extendedStart.getTime() - 6 * DAY);
        updateData.trialUsed = true;
      }
    } else if (trialAction === "expire") {
      updateData.trialStartedAt = new Date(Date.now() - 8 * DAY);
      updateData.trialUsed = true;
    } else if (trialAction === "clear") {
      updateData.trialStartedAt = null;
    }

    const updatedUser = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedUser) return res.status(404).json({ error: "Creator profile not found" });
    res.json({ success: true, user: adminUserResponse(updatedUser) });
  } catch (err) {
    console.error("Update admin user error:", err.message);
    res.status(500).json({ error: "Failed to update creator profile" });
  }
});

router.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
  if (!requireDatabase(res)) return;
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ error: "Creator profile not found" });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete admin user error:", err.message);
    res.status(500).json({ error: "Failed to delete creator profile" });
  }
});

module.exports = router;
