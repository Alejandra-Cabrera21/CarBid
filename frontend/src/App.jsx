import { Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/index";
import Register from "./pages/register";
import Login from "./pages/login";          

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
