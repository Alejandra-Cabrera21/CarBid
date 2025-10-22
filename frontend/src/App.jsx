import { Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/index";
import Register from "./pages/register";

export default function App() {
  return (
    <Routes>
      {/* Rutas “canónicas” sin .html */}
      <Route path="/" element={<Index />} />
      <Route path="/register" element={<Register />} />

      
      {/* 404 → home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
