const jwt = require("jsonwebtoken");

const SESSION_SECRET = process.env.SESSION_SECRET || "your-fallback-secret";
const COOKIE_NAME = "session_token";

module.exports = {
  /**
   * Sets a secure HTTP-only cookie with a JWT session token
   */
  setSessionCookie: (res, user) => {
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      SESSION_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  },

  /**
   * Clears the session cookie
   */
  clearSessionCookie: (res) => {
    res.clearCookie(COOKIE_NAME);
  },

  /**
   * Extracts and verifies the user from the session cookie
   */
  getSessionUser: async (req) => {
    const token = req.cookies[COOKIE_NAME];
    if (!token) return null;

    try {
      return jwt.verify(token, SESSION_SECRET);
    } catch (err) {
      return null;
    }
  },

  /**
   * Middleware for protecting API routes
   */
  requireApiAuth: async (req, res, next) => {
    const user = await module.exports.getSessionUser(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }
    req.user = user;
    next();
  },

  /**
   * Middleware for protecting static pages or routes
   */
  requirePageAuth: async (req, res, next) => {
    const user = await module.exports.getSessionUser(req);
    if (!user) {
      return res.redirect("/login.html");
    }
    req.user = user;
    next();
  },

  /**
   * Sanitizes user object for public consumption
   */
  publicUser: (user) => {
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
  },
};
