const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  updateUser,
  deleteUser,
  getAllVehicles,
  createVehicleAdmin,
  updateVehicleAdmin,
  deleteVehicleAdmin,
  getAllBookings,
  createBookingAdmin,
  updateBookingAdmin,
  deleteBookingAdmin,
  getAllInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  getAllServiceRecords,
  createServiceRecord,
  updateServiceRecord,
  deleteServiceRecord,
  getAllBills,
  createBill,
  updateBill,
  deleteBill,
} = require("../controllers/adminController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware"); // <-- Multer imported perfectly

// User Management
router.get("/users", protect, getAllUsers);
router.put("/users/:id", protect, updateUser);
router.delete("/users/:id", protect, deleteUser);

// Vehicle Management (Cleaned up!)
router.get("/vehicles", protect, getAllVehicles);
router.post("/vehicles", protect, upload.single("photo"), createVehicleAdmin); // <-- Only ONE POST route here
router.put('/vehicles/:id', protect, upload.single('photo'), updateVehicleAdmin);
router.delete("/vehicles/:id", protect, deleteVehicleAdmin);

// Booking Management
router.get("/bookings", protect, getAllBookings);
router.post("/bookings", protect, createBookingAdmin);
router.put("/bookings/:id", protect, updateBookingAdmin);
router.delete("/bookings/:id", protect, deleteBookingAdmin);

// Inventory Management
router.get("/inventory", protect, getAllInventory);
router.post("/inventory", protect, createInventoryItem);
router.put("/inventory/:id", protect, updateInventoryItem);
router.delete("/inventory/:id", protect, deleteInventoryItem);

// Service Floor Management
router.get("/service-records", protect, getAllServiceRecords);
router.post("/service-records", protect, createServiceRecord);
router.put("/service-records/:id", protect, updateServiceRecord);
router.delete("/service-records/:id", protect, deleteServiceRecord);

// Billing Management
router.get("/bills", protect, getAllBills);
router.post("/bills", protect, createBill);
router.put("/bills/:id", protect, updateBill);
router.delete("/bills/:id", protect, deleteBill);

module.exports = router;
