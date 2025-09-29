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

// 🔑 Habilitar CORS
app.use(cors({
  origin: ["https://alejandra-cabrera21.github.io"], // frontend en GitHub Pages
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

// Middleware para JSON
app.use(express.json());

// Servir archivos estáticos de la carpeta uploads (imágenes)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Rutas
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/auctions", auctionRoutes);
app.use("/bids", bidRoutes);

// Ruta raíz
app.get("/", (req, res) => {
  res.send("🚗 Bienvenido a la API de CarBid!");
});

// 🔄 Sincronizar DB y levantar servidor
sequelize.sync().then(() => {
  console.log("📦 Base de datos sincronizada con éxito");
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("❌ Error al sincronizar la base de datos:", err);
});
