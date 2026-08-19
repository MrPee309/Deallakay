import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppProvider } from "@/contexts/AppContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { Layout, ProtectedRoute } from "@/components/Layout";

import Home from "@/pages/Home";
import Browse from "@/pages/Browse";
import ProductPage from "@/pages/ProductPage";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import VerifyEmail from "@/pages/VerifyEmail";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AddProduct from "@/pages/AddProduct";import SellerDashboard from "@/pages/SellerDashboard";
import SellerProfile from "@/pages/SellerProfile";
import Technicians from "@/pages/Technicians";
import TechnicianProfile from "@/pages/TechnicianProfile";
import BecomeTechnicianPage from "@/pages/BecomeTechnicianPage";
import TechnicianDashboard from "@/pages/TechnicianDashboard";
import Messages from "@/pages/Messages";
import Favorites from "@/pages/Favorites";
import Notifications from "@/pages/Notifications";
import Profile from "@/pages/Profile";
import AdminDashboard from "@/pages/AdminDashboard";
import { HowItWorks, Safety } from "@/pages/StaticPages";

function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-center" richColors />
          <Routes>
            {/* Auth pages (no layout chrome) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/product/:slug" element={<ProductPage />} />
              <Route path="/seller/:username" element={<SellerProfile />} />
              <Route path="/technicians" element={<Technicians />} />
              <Route path="/technician/:username" element={<TechnicianProfile />} />
              <Route path="/become-technician" element={<ProtectedRoute><BecomeTechnicianPage /></ProtectedRoute>} />
              <Route path="/technician-dashboard" element={<ProtectedRoute><TechnicianDashboard /></ProtectedRoute>} />
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/safety" element={<Safety />} />

              <Route path="/sell" element={<ProtectedRoute><AddProduct /></ProtectedRoute>} />
              <Route path="/edit-product/:id" element={<ProtectedRoute><AddProduct /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><SellerDashboard /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/favorites" element={<ProtectedRoute><Favorites /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppProvider>
  );
}

export default App;
