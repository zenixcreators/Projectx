const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (dnsErr) {
  console.warn("Could not set public DNS resolvers:", dnsErr.message);
}

const mongoose = require("mongoose");
const User = require("../backend/src/models/User");
require("dotenv").config({ path: require('path').join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function listAdmins() {
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set in environment.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI);
    const admins = await User.find({ role: "admin" }, "email firstName lastName createdAt");
    if (admins.length === 0) {
      console.log("NO_ADMINS_FOUND");
    } else {
      console.log("ADMINS:", JSON.stringify(admins, null, 2));
    }
  } catch (err) {
    console.error("Database connection error:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}

listAdmins();
