// Importa React para poder usar JSX y componentes
import React from "react";
// Importa ReactDOM para renderizar la aplicación en el navegador
import ReactDOM from "react-dom/client";
// Importa el enrutador de React para manejar las rutas de la app
import { BrowserRouter } from "react-router-dom";
// Importa el componente principal de la aplicación
import App from "./App.jsx";
// Importa los estilos globales de la aplicación
import "./index.css"; 

// Busca el elemento con id  y crea la raíz de React
ReactDOM.createRoot(document.getElementById("root")).render(
  // StrictMode ayuda a detectar problemas en desarrollo 
  <React.StrictMode>
   
    <BrowserRouter>

      <App />
    </BrowserRouter>
  </React.StrictMode>
);
