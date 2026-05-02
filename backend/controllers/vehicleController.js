const Vehicle = require("../models/Vehicle");
const fs = require('fs');
const path = require('path');

// @route   POST /api/vehicles
// @desc    Add a new vehicle (User)
// CREATE VEHICLE (For logged-in user)
exports.createVehicle = async (req, res) => {
  try {
    const { plate, makeModel } = req.body;

    // Check if an image was uploaded
    let photo = null;
    if (req.file) {
      photo = `/uploads/${req.file.filename}`;
    }

    // Notice we use req.user.id automatically instead of asking for it!
    const newVehicle = await Vehicle.create({
      userId: req.user.id,
      plate,
      makeModel,
      photo,
    });

    res.status(201).json(newVehicle);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @route   GET /api/vehicles/mycars
// @desc    Get logged in user's vehicles (User)
exports.getMyVehicles = async (req, res) => {
  try {
    const vehicles = await Vehicle.find({ userId: req.user.id });
    res.status(200).json(vehicles);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @route   DELETE /api/vehicles/:id
// @desc    Remove a vehicle (User)
exports.deleteVehicle = async (req, res) => {
  try {
    await Vehicle.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Vehicle removed" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// @route   PUT /api/vehicles/:id
// @desc    Update a vehicle (User)
exports.updateVehicle = async (req, res) => {
  try {
    const updatedVehicle = await Vehicle.findByIdAndUpdate(
      req.params.id,
      { plate: req.body.plate, makeModel: req.body.makeModel },
      { returnDocument: "after" },
    );
    res.status(200).json(updatedVehicle);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// UPDATE VEHICLE
exports.updateVehicle = async (req, res) => {
  try {
    const { plate, makeModel } = req.body;
    let vehicle = await Vehicle.findById(req.params.id);

    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    if (vehicle.userId.toString() !== req.user.id) return res.status(401).json({ message: "Not authorized" });

    let updatedData = { plate, makeModel };

    // If a new file was uploaded during the edit
    if (req.file) {
      // 1. Delete the OLD photo from the server physically
      if (vehicle.photo) {
        const oldImagePath = path.join(__dirname, '..', vehicle.photo);
        fs.unlink(oldImagePath, (err) => {
          if (err) console.error("Old image cleanup failed:", err);
        });
      }
      // 2. Set the NEW photo path for the database
      updatedData.photo = `/uploads/${req.file.filename}`;
    }

    const updatedVehicle = await Vehicle.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    res.status(200).json(updatedVehicle);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// DELETE VEHICLE
exports.deleteVehicle = async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    if (vehicle.userId.toString() !== req.user.id) return res.status(401).json({ message: "Not authorized" });

    // Physically delete the photo from the uploads folder
    if (vehicle.photo) {
      const imagePath = path.join(__dirname, '..', vehicle.photo);
      fs.unlink(imagePath, (err) => {
        if (err) console.error("Image cleanup failed:", err);
      });
    }

    await Vehicle.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Vehicle and associated image deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};