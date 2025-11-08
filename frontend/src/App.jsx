// Importa las rutas y componentes principales
import { Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/index";
import Register from "./pages/register";
import Login from "./pages/login";    
import IndexVendedor from "./pages/indexvendedor";   
import IndexComprador from "./pages/indexcomprador";
import CrearPublicacion from "./pages/crear-publicacion.jsx";
import MisSubastas from "./pages/mis-subastas.jsx";
import HistorialPujas from "./pages/historial-pujas.jsx";
import Perfil from "./pages/perfil.jsx";
import HistorialSubastas from "./pages/historial-subastas.jsx";

// Definición las rutas de la aplicación
export default function App() {
  return (
    <Routes>
      {/* Rutas principales */}
      <Route path="/" element={<Index />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/indexvendedor" element={<IndexVendedor />} />
      <Route path="/indexcomprador" element={<IndexComprador />} />  
      <Route path="/crear-publicacion" element={<CrearPublicacion />} />  
      <Route path="/mis-subastas" element={<MisSubastas />} />
      <Route path="/historial-pujas" element={<HistorialPujas />} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="/historial-subastas" element={<HistorialSubastas />} />

      {/* Redirige al inicio caundo es ruta desconocida  */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
