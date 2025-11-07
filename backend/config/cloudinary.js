//cloudinary es un servicio de alojamiento de imágenes y videos en la nube.
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary"); //multer es un middleware para manejar la subida de archivos en Node.js

// Configuración segura con variables de entorno (Render las leerá automáticamente)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dnwrtu9vp",
  api_key: process.env.CLOUDINARY_API_KEY || "886762463259373",
  api_secret: process.env.CLOUDINARY_API_SECRET || "qXpj1bCu2PGHlnjG2Ipm7QP1ywE",
});

// Configuración del almacenamiento en Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "carbid_auctions", // Carpeta en Cloudinary para almacenar las imágenes
    allowed_formats: ["jpg", "jpeg", "png"], // Formatos permitidos
    transformation: [{ width: 800, height: 600, crop: "limit" }], // Transformación de las imágenes al subirlas a Cloudinary
  },
});

module.exports = { cloudinary, storage };