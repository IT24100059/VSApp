const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const User = require("./models/User");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("⏳ Connected to Database. Generating test accounts...");

    // 1. Clear any old test data to avoid errors
    await User.deleteMany({});

    // 2. Hash a simple password for testing
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash("password123", salt);

    // 3. Create 1 Admin and 1 User
    await User.create([
      {
        name: "Garage Admin",
        email: "admin@garage.com",
        password: hashedPassword,
        phone: "0771234567",
        role: "admin",
      },
      {
        name: "Pasan Dharmadasa",
        email: "pasan@test.com",
        password: hashedPassword,
        phone: "0719876543",
        role: "user",
      },
    ]);

    console.log("✅ Success! Accounts created.");
    console.log(
      "👨‍🔧 Admin Login -> Email: admin@garage.com | Pass: password123",
    );
    console.log("👤 User Login  -> Email: pasan@test.com | Pass: password123");

    // Disconnect safely
    process.exit();
  })
  .catch((err) => {
    console.error("❌ Error:", err);
    process.exit(1);
  });
