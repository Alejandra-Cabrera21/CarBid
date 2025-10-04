const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

// Configuración segura con variables de entorno (Render las leerá automáticamente)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dnwrtu9vp",
  api_key: process.env.CLOUDINARY_API_KEY || "886762463259373",
  api_secret: process.env.CLOUDINARY_API_SECRET || "qXpj1bCu2PGHlnjG2Ipm7QP1ywE",
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "carbid_auctions", // Carpeta en Cloudinary
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ width: 800, height: 600, crop: "limit" }],
  },
});

module.exports = { cloudinary, storage };