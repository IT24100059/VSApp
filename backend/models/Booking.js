const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    date: { type: String, required: true },
    timeSlot: { type: String, required: true },
    selectedServices: { type: [String], required: true }, // Array of services
    totalPrice: { type: Number, required: true },
    estimatedTime: { type: String },
    status: {
      type: String,
      enum: ["Upcoming", "Completed", "Cancelled"],
      default: "Upcoming",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Booking", bookingSchema);
