const User = require("../models/User");
const Vehicle = require("../models/Vehicle");
const Booking = require("../models/Booking");
const Inventory = require("../models/Inventory");
const ServiceRecord = require("../models/ServiceRecord");
const Bill = require("../models/Bill");
const fs = require('fs');
const path = require('path');

// ==========================================
// 1. ADMIN USER MANAGEMENT
// ==========================================
exports.getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const users = await User.find({ role: "user" }).select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const { name, email, phone, nic } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, phone, nic },
      { returnDocument: "after" },
    ).select("-password");
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ==========================================
// 2. ADMIN VEHICLE MANAGEMENT
// ==========================================
exports.getAllVehicles = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const vehicles = await Vehicle.find().populate("userId", "name phone");
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.createVehicleAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const { userId, plate, makeModel } = req.body;

    // Check if an image was uploaded via Multer
    let photo = null;
    if (req.file) {
      photo = `/uploads/${req.file.filename}`;
    }

    const newVehicle = await Vehicle.create({
      userId,
      plate,
      makeModel,
      photo,
    });
    await newVehicle.populate("userId", "name phone");
    res.status(201).json(newVehicle);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.updateVehicleAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const { userId, plate, makeModel } = req.body;
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { userId, plate, makeModel },
      { returnDocument: "after" },
    ).populate("userId", "name phone");
    res.status(200).json(updatedVehicle);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.deleteVehicleAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    await Vehicle.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Vehicle removed" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.updateVehicleAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin access only" });
    
    const { userId, plate, makeModel } = req.body;
    let vehicle = await Vehicle.findById(req.params.id);
    
    let updatedData = { userId, plate, makeModel };

    // If admin uploaded a new photo
    if (req.file) {
      // Physically delete the old photo
      if (vehicle.photo) {
        const oldImagePath = path.join(__dirname, '..', vehicle.photo);
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error("Old image cleanup failed:", err);
        });
      }
      updatedData.photo = `/uploads/${req.file.filename}`;
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(req.params.id, updatedData, { new: true }).populate('userId', 'name phone');
    res.status(200).json(updatedVehicle);
  } catch (error) { 
    res.status(500).json({ message: "Server Error" }); 
  }
};

exports.deleteVehicleAdmin = async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: "Admin access only" });
    
    const vehicle = await Vehicle.findById(req.params.id);
    
    // Physically delete the photo from the server
    if (vehicle.photo) {
      const imagePath = path.join(__dirname, '..', vehicle.photo);
      fs.unlink(imagePath, (err) => {
        if (err) console.error("Image cleanup failed:", err);
      });
    }

    await Vehicle.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Vehicle and image removed" });
  } catch (error) { 
    res.status(500).json({ message: "Server Error" }); 
  }
};

// ==========================================
// 3. ADMIN BOOKING MANAGEMENT
// ==========================================
exports.getAllBookings = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const bookings = await Booking.find()
      .populate("userId", "name phone nic")
      .populate("vehicleId", "plate makeModel")
      .sort({ date: 1 });
    res.status(200).json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.createBookingAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const newBooking = await Booking.create(req.body);
    await newBooking.populate("userId", "name phone");
    await newBooking.populate("vehicleId", "plate makeModel");
    res.status(201).json(newBooking);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.updateBookingAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const updatedBooking = await Booking.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after" },
    )
      .populate("userId", "name phone")
      .populate("vehicleId", "plate makeModel");
    res.status(200).json(updatedBooking);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.deleteBookingAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    await Booking.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Booking removed" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ==========================================
// 4. ADMIN INVENTORY MANAGEMENT
// ==========================================
exports.getAllInventory = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const inventory = await Inventory.find().sort({ createdAt: -1 });
    res.status(200).json(inventory);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.createInventoryItem = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const newItem = await Inventory.create(req.body);
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.updateInventoryItem = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const updatedItem = await Inventory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after" },
    );
    res.status(200).json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.deleteInventoryItem = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    await Inventory.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Item removed" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ==========================================
// 5. ADMIN SERVICE RECORD MANAGEMENT
// ==========================================
exports.getAllServiceRecords = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const records = await ServiceRecord.find()
      .populate("userId", "name phone")
      .populate("vehicleId", "plate makeModel")
      .sort({ createdAt: -1 });
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.createServiceRecord = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const newRecord = await ServiceRecord.create(req.body);
    await newRecord.populate("userId", "name phone");
    await newRecord.populate("vehicleId", "plate makeModel");
    res.status(201).json(newRecord);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.updateServiceRecord = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const updatedRecord = await ServiceRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { returnDocument: "after" },
    )
      .populate("userId", "name phone")
      .populate("vehicleId", "plate makeModel");
    res.status(200).json(updatedRecord);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.deleteServiceRecord = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    await ServiceRecord.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Record deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ==========================================
// 6. ADMIN BILLING MANAGEMENT
// ==========================================
exports.getAllBills = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const bills = await Bill.find().sort({ createdAt: -1 });
    res.status(200).json(bills);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.createBill = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const record = await ServiceRecord.findById(req.body.serviceRecordId);
    const newBill = await Bill.create({ ...req.body, userId: record.userId });
    res.status(201).json(newBill);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.updateBill = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    const updatedBill = await Bill.findByIdAndUpdate(req.params.id, req.body, {
      returnDocument: "after",
    });
    res.status(200).json(updatedBill);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.deleteBill = async (req, res) => {
  try {
    if (req.user.role !== "admin")
      return res.status(403).json({ message: "Admin access only" });
    await Bill.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Bill deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
