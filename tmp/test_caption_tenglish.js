const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  console.warn("Could not set public DNS resolvers:", dnsErr.message);
}

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SESSION_SECRET = process.env.SESSION_SECRET;
const COOKIE_NAME = 'creo_token';

async function testTenglish() {
  try {
    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    
    // Find any active user
    const User = mongoose.model('User', new mongoose.Schema({
      email: String,
      status: String,
      tokenVersion: Number
    }));
    
    const user = await User.findOne({ status: 'active' }) || await User.findOne({});
    if (!user) {
      throw new Error("No user found in the database. Please sign up first.");
    }
    
    console.log(`Found user: ${user.email} (ID: ${user._id})`);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: String(user._id), version: user.tokenVersion || 0 },
      SESSION_SECRET,
      { expiresIn: "7d" }
    );
    
    console.log("Generated JWT. Sending caption request to server...");
    
    const response = await axios.post('http://localhost:3000/caption', {
      type: 'text',
      value: 'ఈ రోజు యూట్యూబ్ లో ఒక కొత్త వీడియో అప్లోడ్ చేసాను. దయచేసి నా ఛానల్ కి సబ్‌స్క్రైబ్ చేసుకోండి, మరియు కామెంట్ రాయండి.',
      langs: JSON.stringify(['tenglish']),
      formats: JSON.stringify(['srt', 'txt']),
      language: 'tenglish'
    }, {
      headers: {
        Cookie: `${COOKIE_NAME}=${token}`
      }
    });
    
    console.log("Response Status:", response.status);
    console.log("Response Data:", JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error("Test failed:", error.response ? error.response.data : error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testTenglish();
