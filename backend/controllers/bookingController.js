const Booking = require("../models/Booking");

// CREATE
exports.createBooking = async (req, res) => {
  try {
    const {
      vehicleId,
      date,
      timeSlot,
      selectedServices,
      totalPrice,
      estimatedTime,
    } = req.body;
    const newBooking = await Booking.create({
      userId: req.user.id,
      vehicleId,
      date,
      timeSlot,
      selectedServices,
      totalPrice,
      estimatedTime,
    });
    res.status(201).json(newBooking);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// READ
exports.getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id }).populate(
      "vehicleId",
      "plate makeModel",
    );
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// UPDATE
exports.updateBooking = async (req, res) => {
  try {
    const updated = await Booking.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
    }).populate("vehicleId", "plate makeModel");
    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// DELETE
exports.deleteBooking = async (req, res) => {
  try {
    await Booking.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Booking removed" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
