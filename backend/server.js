const express = require("express");
const cors = require("cors");
const path = require("path");
const sequelize = require("./db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const auctionRoutes = require("./routes/auctions");
const bidRoutes = require("./routes/bids");

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Habilitar CORS correctamente (para GitHub Pages y Render)
app.use(cors({
  origin: [
    "https://alejandra-cabrera21.github.io", // Frontend (GitHub Pages)
    "https://carbid-rvqj.onrender.com"       // Backend (Render)
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

// ✅ Manejo de preflight requests
app.options("*", cors());

// Middleware para JSON
app.use(express.json());

// ✅ Servir imágenes correctamente desde /uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ✅ Rutas principales
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/auctions", auctionRoutes);
app.use("/bids", bidRoutes);

// ✅ Ruta base
app.get("/", (req, res) => {
  res.send("🚗 Bienvenido a la API de CarBid!");
});

// ✅ Sincronización de base de datos y arranque del servidor
sequelize.sync().then(() => {
  console.log("📦 Base de datos sincronizada con éxito");
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("❌ Error al sincronizar la base de datos:", err);
});