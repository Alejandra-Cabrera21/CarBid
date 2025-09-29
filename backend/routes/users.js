const express = require("express");
const router = express.Router();
const Auction = require("../models/Auction");
const Bid = require("../models/Bid");

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

module.exports = router;
