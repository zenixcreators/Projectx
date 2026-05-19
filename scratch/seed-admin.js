require("dotenv").config({ override: true });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../backend/models/User");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/nexus";
const ADMIN_EMAIL = "admincoresuperlogin@gmail.com";
const ADMIN_PASSWORD = "Make1crinoneyear";

async function seedAdmin() {
  console.log("Connecting to MongoDB...");
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully.");

    const normalizedEmail = ADMIN_EMAIL.toLowerCase().trim();
    
    // Hash the password securely with standard bcrypt strength
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      console.log(`Found existing user with email ${normalizedEmail}. Upgrading to admin...`);
      user.password = hashedPassword;
      user.role = "admin";
      user.plan = "pro";
      user.firstName = "Admin";
      user.lastName = "Core";
      user.emailVerified = true;
      await user.save();
      console.log("Admin credentials updated successfully!");
    } else {
      console.log(`Creating new administrator account for ${normalizedEmail}...`);
      user = await User.create({
        email: normalizedEmail,
        password: hashedPassword,
        role: "admin",
        plan: "pro",
        firstName: "Admin",
        lastName: "Core",
        emailVerified: true
      });
      console.log("Admin credentials created successfully!");
    }
  } catch (err) {
    console.error("Failed to seed admin user:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seedAdmin();
