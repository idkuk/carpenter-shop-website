import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import './App.css';
import 'react-toastify/dist/ReactToastify.css';

// Import Pages
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyContact from './pages/VerifyContact';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Services from './pages/Services';
import Orders from './pages/Orders';
import Cart from './pages/Cart';

import NewOrder from './pages/NewOrder';
import OrderDetails from './pages/OrderDetails';
import Inventory from './pages/Inventory';

import About from './pages/About';
import Portfolio from './pages/Portfolio';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';
import ServiceManagement from './pages/ServiceManagement';

// Import Components
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import { useAuth } from './context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page-loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

const DashboardRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="page-loading">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <Navigate to="/orders" replace />;
};

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <div className="container mt-4">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/verify-contact" element={<VerifyContact />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/services" element={<Services />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/about" element={<About />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={<DashboardRoute />} />

            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <Orders />
                </ProtectedRoute>
              }
            />

            <Route path="/orders/new" element={<Navigate to="/custom-order" replace />} />
            <Route
              path="/custom-order"
              element={
                <ProtectedRoute>
                  <NewOrder />
                </ProtectedRoute>
              }
            />

            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderDetails />
                </ProtectedRoute>
              }
            />

            <Route
              path="/inventory"
              element={
                <ProtectedRoute roles={['admin', 'employee']}>
                  <Inventory />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/services"
              element={
                <ProtectedRoute roles={['admin']}>
                  <ServiceManagement />
                </ProtectedRoute>
              }
            />

            {/* Default Route */}
            <Route path="/" element={<Navigate to="/services" />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
        <Footer />
        <ToastContainer position="top-right" autoClose={3000} />
      </div>
    </Router>
  );
}

export default App;
