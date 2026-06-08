// Resolve MongoDB Atlas DNS SRV lookups using Google & Cloudflare Public DNS resolvers natively
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  console.warn("Could not set public DNS resolvers:", dnsErr.message);
}

require('dotenv').config({ path: require('path').join(__dirname, '../.env'), override: true });
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const helmet = require('helmet');
const morgan = require('morgan');

mongoose.set('bufferCommands', false);

// Connect to MongoDB with automatic fallback
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    if (process.env.NODE_ENV === 'production') {
      console.error("Error: MONGODB_URI is missing in production.");
      process.exit(1);
    }
    try {
      await mongoose.connect("mongodb://127.0.0.1:27017/creo");
      console.log("Connected to local MongoDB for Creo Creator Studio successfully.");
    } catch (err) {
      console.error("Local MongoDB connection failed:", err.message);
    }
    return;
  }

  try {
    // Try Atlas with a shorter timeout (5s) to avoid long hangs
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log("Connected to MongoDB Atlas for Creo Creator Studio successfully.");
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error("MongoDB Atlas connection failed in production:", err.message);
      process.exit(1);
    }
    console.error("MongoDB Atlas connection failed. Trying local fallback...", err.message);
    try {
      await mongoose.disconnect();
      await mongoose.connect("mongodb://127.0.0.1:27017/creo", { serverSelectionTimeoutMS: 5000 });
      console.log("Connected to local fallback MongoDB successfully.");
    } catch (localErr) {
      console.error("Local fallback MongoDB connection also failed:", localErr.message);
    }
  }
};

connectDB();

// Import authentication services
const { requireApiAuth, requirePageAuth } = require("./src/services/auth/session");

// Import limit checking middlewares
const { checkLimit, incrementOnSuccess } = require("./src/middleware/limitCheck");

// Import routes
const authRoute = require("./src/routes/auth");
const adminRoute = require("./src/routes/admin");
const captionRoute = require("./src/routes/caption");
const generationRoute = require("./src/routes/generation");
const scriptRoute = require("./src/routes/script");
const channelRoutes = require("./src/routes/channelAnalysis");
const userRoute = require("./src/routes/user");
const contactRoute = require("./src/routes/contact");
const feedbackRoute = require("./src/routes/feedback");
const thumbnailAnalysisRoute = require("./src/routes/thumbnailAnalysis");

const app = express();
const rateLimit = require('express-rate-limit');

// Custom Rate Limiters for expensive AI endpoints
const analyzeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: "Too many script analyses requested. Please try again in 15 minutes." }
});

const captionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: "Too many captions generated. Please try again in 15 minutes." }
});

const channelLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { error: "Too many competitor channel scans requested. Please try again in 15 minutes." }
});

// Middleware
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || '*' }));
app.use(express.json());
app.use(cookieParser());
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", "https://accounts.google.com", "https://oauth2.googleapis.com", "https://googleidtoolkit.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://cdn.tailwindcss.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://api.fontshare.com", "https://accounts.google.com"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com", "https://cdn.fontshare.com"],
      frameSrc: ["'self'", "https://accounts.google.com", "https://www.youtube.com", "https://youtube.com", "https://*.youtube.com", "https://www.youtube-nocookie.com"],
      imgSrc: ["'self'", "data:", "https://lh3.googleusercontent.com", "https://*.googleusercontent.com", "https://i.pravatar.cc", "https://*.ytimg.com", "https://*.ggpht.com", "https://*.youtube.com"],
      mediaSrc: ["'self'", "data:", "blob:"]
    }
  }
}));
app.use(morgan('combined'));

app.post('/api/client-error', (req, res) => {
  console.error('*** CLIENT EXCEPTION DETECTED ***', req.body);
  res.json({ success: true });
});

// Scoped Rate Limiting (Applied specifically to costly routes before loading the route handlers)
app.use('/analyze', analyzeLimiter);
app.use('/caption', captionLimiter);
app.use('/api/channel', channelLimiter);

// 1. Auth routes (Public)
app.use(authRoute);

// Admin routes
app.use(adminRoute);

// 2. Protected App Static Area
app.use('/app', requirePageAuth, express.static(path.join(__dirname, '../frontend/public/app')));

// 3. Protected API Routes
// We apply the requireApiAuth middleware to specific paths before loading the routes
// This protects the endpoints while preserving their original URL structure
app.use([
  '/caption',
  '/analyze',
  '/api/generate-hooks',
  '/api/test-hook',
  '/api/test-script',
  '/api/generate-image',
  '/api/generated-images',
  '/api/channel',
  '/api/script/generate',
  '/api/analyze-thumbnail',
  '/api/analyze-thumbnail-url'
], requireApiAuth);

// Apply limit checking & tracking to AI generation routes
app.post([
  '/caption',
  '/analyze',
  '/api/generate-hooks',
  '/api/test-hook',
  '/api/test-script',
  '/api/generate-image',
  '/api/script/generate',
  '/api/channel/analyze',
  '/api/analyze-thumbnail',
  '/api/analyze-thumbnail-url'
], checkLimit, incrementOnSuccess);

app.use(userRoute);
app.use(captionRoute);
app.use(scriptRoute);
app.use(generationRoute);
app.use(contactRoute);
app.use(feedbackRoute);
app.use(thumbnailAnalysisRoute);
app.use("/api/channel", channelRoutes);

// 4. Public Static Files (Landing, Login, Signup)
app.use(express.static(path.join(__dirname, '../frontend/public'), { extensions: ['html', 'htm'] }));

// 5. Admin Dashboard Static Files
app.use('/admin', express.static(path.join(__dirname, '../admin/public'), { extensions: ['html', 'htm'] }));

// 6. User Uploads Static Files (Avatars)
app.use('/uploads', express.static(path.join(__dirname, 'src/uploads')));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (req.path && req.path.startsWith('/auth/')) {
    return res.status(err.status || 500).json({ error: err.message || 'Authentication request failed.' });
  }
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
