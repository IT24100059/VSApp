const express = require("express");
const router = express.Router();
const { getMyBills } = require("../controllers/billController");
const { protect } = require("../middleware/authMiddleware");

// Protected User Route
router.get("/mybills", protect, getMyBills);

module.exports = router;
