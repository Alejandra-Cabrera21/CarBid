const express = require("express");
const router = express.Router();
const User = require("../models/User");
const generateVendorCode = require("../utils/generateCode");

// === REGISTRO COMPRADOR ===
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.create({ email, password, role: "comprador" });
    res.json({
      message: "Comprador registrado con éxito",
      id: user.id,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// === LOGIN COMPRADOR ===
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email, password, role: "comprador" } });

    if (!user) return res.status(400).json({ error: "Credenciales inválidas" });

    res.json({
      message: "Login exitoso",
      id: user.id,
      email: user.email,
      role: user.role
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// === REGISTRO VENDEDOR ===
router.post("/register-vendedor", async (req, res) => {
  try {
    const { email, password } = req.body;
    const vendorCode = generateVendorCode();
    const user = await User.create({ email, password, role: "vendedor", vendorCode });

    res.json({
      message: "Vendedor registrado con éxito",
      id: user.id,
      email: user.email,
      role: "vendedor",
      vendorCode
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// === LOGIN VENDEDOR ===
router.post("/login-vendedor", async (req, res) => {
  try {
    const { email, password, vendorCode } = req.body;
    const user = await User.findOne({ where: { email, password, role: "vendedor", vendorCode } });

    if (!user) return res.status(400).json({ error: "Credenciales inválidas" });

    res.json({
      message: "Login exitoso",
      id: user.id,
      email: user.email,
      role: "vendedor",
      vendorCode: user.vendorCode
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;