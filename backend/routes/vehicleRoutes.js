const express = require("express");
const router = express.Router();
const {
  getMyVehicles,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} = require("../controllers/vehicleController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware"); // <-- IMPORT MULTER

// User Vehicle Routes
router.get("/", protect, getMyVehicles);
router.post("/", protect, upload.single("photo"), createVehicle); // <-- ADD MULTER HERE
router.put('/:id', protect, upload.single('photo'), updateVehicle);
router.delete("/:id", protect, deleteVehicle);

module.exports = router;
