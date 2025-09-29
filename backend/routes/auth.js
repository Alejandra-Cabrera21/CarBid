const express = require("express");
const router = express.Router();
const User = require("../models/User");
const generateVendorCode = require("../utils/generateCode");

router.post("/register-vendedor", async (req, res) => {
  try {
    const { email, password } = req.body;
    const vendorCode = generateVendorCode();
    const user = await User.create({ email, password, role: "vendedor", vendorCode });
    res.json({ message: "Vendedor registrado con éxito", vendorCode });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
