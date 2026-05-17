const express = require("express");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { 
  setSessionCookie, 
  clearSessionCookie, 
  getSessionUser, 
  publicUser 
} = require("../services/auth/session");

const router = express.Router();
const usersFile = path.join(__dirname, "../../data/users.json");

// Helper to manage local JSON "database"
function getUsers() {
  if (!fs.existsSync(usersFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(usersFile, "utf-8"));
  } catch (e) { return []; }
}

function saveUsers(users) {
  if (!fs.existsSync(path.dirname(usersFile))) {
    fs.mkdirSync(path.dirname(usersFile), { recursive: true });
  }
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

/**
 * GET /auth/config
 * Provides public configuration
 */
router.get("/auth/config", (req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || "" });
});

/**
 * POST /auth/signup
 * Handles local user registration with password hashing
 */
router.post("/auth/signup", async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Required fields missing" });

    const users = getUsers();
    if (users.find(u => u.email === email)) return res.status(400).json({ error: "User already exists" });

    // Hash the password before saving
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = {
      id: crypto.randomUUID(),
      email,
      password: hashedPassword,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      createdAt: new Date().toISOString()
    };

    users.push(user);
    saveUsers(users);

    setSessionCookie(res, user);
    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * POST /auth/login
 * Handles local user authentication
 */
router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.email === email);
    
    if (!user || !user.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    setSessionCookie(res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Google authentication restored as per request
/**
 * POST /auth/google
 * Handles Google One Tap / OAuth2 credential verification
 */
router.post("/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;
    // Verify with Google API
    const response = await axios.get(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    const payload = response.data;

    if (!payload.email) throw new Error("Invalid Google token");

    const users = getUsers();
    let user = users.find(u => u.email === payload.email);

    if (!user) {
      // Create new user if they don't exist
      user = {
        id: crypto.randomUUID(),
        email: payload.email,
        firstName: payload.given_name,
        lastName: payload.family_name || "",
        name: payload.name,
        avatar: payload.picture,
        provider: "google",
        createdAt: new Date().toISOString()
      };
      users.push(user);
      saveUsers(users);
    }

    setSessionCookie(res, user);
    res.json({ user: publicUser(user) });
  } catch (err) {
    console.error("Google auth error:", err.message);
    res.status(401).json({ error: "Google authentication failed" });
  }
});

/**
 * GET /auth/me
 * Returns current session user info
 */
router.get("/auth/me", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) return res.status(401).json({ error: "Not authenticated" });
  res.json({ user: publicUser(user) });
});

/**
 * POST /auth/logout
 * Clears the session cookie
 */
router.post("/auth/logout", (req, res) => {
  clearSessionCookie(res);
  res.json({ success: true });
});

module.exports = router;
