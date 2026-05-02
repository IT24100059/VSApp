const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    quantityInStock: { type: Number, required: true },
    reorderLevel: { type: Number, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Inventory", inventorySchema);
