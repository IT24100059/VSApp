const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const path = require("path");

// Initialize Express
const app = express();

// Middleware (Allows your Expo app to talk to this server)
app.use(cors());
app.use(express.json());

// --- WE WILL ADD ROUTES HERE NEXT ---
app.use("/api/auth", require("./routes/authRoutes"));

app.use("/api/vehicles", require("./routes/vehicleRoutes"));

app.use("/api/bookings", require("./routes/bookingRoutes"));

app.use("/api/admin", require("./routes/adminRoutes"));

app.use("/api/bills", require("./routes/billRoutes"));

// Make the uploads folder publicly accessible via the /uploads URL
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
// --- MONGODB CONNECTION ---
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully to GarageDB!"))
  .catch((err) => console.log("❌ MongoDB Connection Error: ", err));

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend Server is running on http://localhost:${PORT}`);
});
