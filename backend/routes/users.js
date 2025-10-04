const express = require("express");
const router = express.Router();
const Auction = require("../models/Auction");
const Bid = require("../models/Bid");
const User = require("../models/User"); // 🔹 Importante: agregar esta línea

// === Historial del comprador ===
router.get("/historial/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const historial = await Bid.findAll({
      where: { userId },
      include: [{ model: Auction }]
    });

    res.json(historial);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// === Cambiar contraseña ===
router.put("/change-password", async (req, res) => {
  try {
    const { id, currentPassword, newPassword } = req.body;
    const user = await User.findByPk(id);

    if (!user || user.password !== currentPassword) {
      return res.status(400).json({ error: "Contraseña actual incorrecta." });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Contraseña actualizada correctamente." });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;