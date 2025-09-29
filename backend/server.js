const express = require("express");
const cors = require("cors");
const sequelize = require("./db");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const auctionRoutes = require("./routes/auctions");
const bidRoutes = require("./routes/bids");

const app = express();
const PORT = 3000;

// Habilitar CORS
app.use(cors({
  origin: ["https://alejandra-cabrera21.github.io"], // frontend en GitHub Pages
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

// Rutas
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/auctions", auctionRoutes);
app.use("/bids", bidRoutes);

// Ruta raíz
app.get("/", (req, res) => {
  res.send("🚗 Bienvenido a la API de CarBid!");
});

// Sincronizar DB y levantar servidor
sequelize.sync().then(() => {
  console.log("📦 Base de datos sincronizada");
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("❌ Error al sincronizar la base de datos:", err);
});

