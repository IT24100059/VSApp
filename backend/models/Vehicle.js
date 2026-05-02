const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    plate: { type: String, required: true },
    makeModel: { type: String, required: true },
    photo: { type: String, default: null },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Vehicle", vehicleSchema);
