const mongoose = require("mongoose");

const partSchema = new mongoose.Schema({
  partId: { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
  partName: String,
  quantity: Number,
  unitPrice: Number,
  totalPrice: Number,
});

const serviceRecordSchema = new mongoose.Schema(
  {
    bookingId: { type: String }, // Just keeping the ID as a reference
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    serviceDate: { type: String, required: true },
    status: {
      type: String,
      enum: ["In Progress", "Completed"],
      default: "In Progress",
    },
    servicesPerformed: { type: [String] },
    usedParts: [partSchema],
    bookingCost: { type: Number, default: 0 },
    partsCost: { type: Number, default: 0 },
    additionalCharges: { type: Number, default: 0 },
    finalTotal: { type: Number, default: 0 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ServiceRecord", serviceRecordSchema);
