const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    nic: { type: String }, // <-- ADDED THIS LINE FOR YOUR PROFILE UI
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
