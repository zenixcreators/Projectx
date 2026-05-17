require('dotenv').config({ override: true });
const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Import authentication services
const { requireApiAuth, requirePageAuth } = require("./services/auth/session");

// Import routes
const authRoute = require("./routes/auth");
const captionRoute = require("./routes/caption");
const generationRoute = require("./routes/generation");
const scriptRoute = require("./routes/script");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

// 1. Auth routes (Public)
app.use(authRoute);

// 2. Protected App Static Area
app.use('/app', requirePageAuth, express.static(path.join(__dirname, 'public/app')));

// 3. Protected API Routes
// We apply the requireApiAuth middleware to specific paths before loading the routes
// This protects the endpoints while preserving their original URL structure
app.use(['/caption', '/analyze', '/api/generate-image', '/api/generated-images'], requireApiAuth);

app.use(captionRoute);
app.use(scriptRoute);
app.use(generationRoute);

// 4. Public Static Files (Landing, Login, Signup)
app.use(express.static('public'));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
