const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Vendor = require("../models/Vendor");

// === REGISTRO DE COMPRADOR ===
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return res.status(400).json({ error: "Ya existe un comprador con este correo." });

    const newUser = await User.create({ email, password });
    res.json({ id: newUser.id, email: newUser.email, role: "comprador" });
  } catch (err) {
    console.error("❌ Error al registrar comprador:", err);
    res.status(500).json({ error: err.message });
  }
});

// === LOGIN COMPRADOR ===
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ where: { email } });

    if (!user || user.password !== password)
      return res.status(400).json({ error: "Correo o contraseña incorrectos." });

    res.json({ id: user.id, email: user.email, role: "comprador" });
  } catch (err) {
    console.error("❌ Error en login comprador:", err);
    res.status(500).json({ error: err.message });
  }
});

// === REGISTRO DE VENDEDOR ===
router.post("/register-vendedor", async (req, res) => {
  try {
    const { email, password } = req.body;
    const existingVendor = await Vendor.findOne({ where: { email } });
    if (existingVendor) return res.status(400).json({ error: "Ya existe un vendedor con este correo." });

    const vendorCode = "V-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const newVendor = await Vendor.create({ email, password, vendorCode });

    res.json({ id: newVendor.id, email: newVendor.email, vendorCode: newVendor.vendorCode, role: "vendedor" });
  } catch (err) {
    console.error("❌ Error al registrar vendedor:", err);
    res.status(500).json({ error: err.message });
  }
});

// === LOGIN DE VENDEDOR ===
router.post("/login-vendedor", async (req, res) => {
  try {
    const { email, password, vendorCode } = req.body;
    const vendor = await Vendor.findOne({ where: { email, vendorCode } });
    if (!vendor) return res.status(400).json({ error: "Correo o código de vendedor incorrecto." });
    if (vendor.password !== password) return res.status(400).json({ error: "Contraseña incorrecta." });

    res.json({ id: vendor.id, email: vendor.email, vendorCode: vendor.vendorCode, role: "vendedor" });
  } catch (err) {
    console.error("❌ Error en login vendedor:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
