const express = require("express");
const router = express.Router();
const {
  createBooking,
  getMyBookings,
  updateBooking,
  deleteBooking,
} = require("../controllers/bookingController");
const { protect } = require("../middleware/authMiddleware");

router.post("/", protect, createBooking);
router.get("/mybookings", protect, getMyBookings);
router.put("/:id", protect, updateBooking);
router.delete("/:id", protect, deleteBooking);

module.exports = router;
