const express = require("express");
const router = express.Router();
const {
  login,
  register,
  getProfile,
  updateProfile,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

router.post("/register", register);
router.post("/login", login);

// Protected Profile Routes
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

module.exports = router;
