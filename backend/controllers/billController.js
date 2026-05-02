const Bill = require("../models/Bill");

// @route   GET /api/bills/mybills
// @desc    Get logged in user's bills
exports.getMyBills = async (req, res) => {
  try {
    // Only find bills that match the logged-in user's ID ticket
    const bills = await Bill.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json(bills);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
