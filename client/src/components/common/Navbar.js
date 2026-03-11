import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaHome, FaShoppingCart, FaSignOutAlt, FaBars, FaTimes, FaBoxOpen, FaMoon, FaSun, FaTools, FaPenFancy, FaHammer } from 'react-icons/fa';
import './Navbar.css';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const { theme, toggleTheme } = useTheme();

  const isLoggedIn = !!user;
  const userRole = user?.role || 'customer';
  const userName = user?.name || 'User';
  const isStaff = userRole === 'admin' || userRole === 'employee';
  const isDark = theme === 'dark';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo" onClick={closeMenu} aria-label="WoodWork Hub home">
          <FaHammer className="logo-icon" />
          <span className="brand-name">WoodWork Hub</span>
        </Link>

        <div className="menu-icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <FaTimes /> : <FaBars />}
        </div>

        <ul className={isMenuOpen ? 'nav-menu active' : 'nav-menu'}>
          <li className="nav-item">
            <Link to="/" className="nav-link" onClick={closeMenu}>
              <FaHome className="nav-icon" />
              <span>Home</span>
            </Link>
          </li>

          {!isStaff && (
            <li className="nav-item">
              <Link to="/cart" className="nav-link" onClick={closeMenu}>
                <FaShoppingCart className="nav-icon" />
                <span>Cart</span>
                {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
              </Link>
            </li>
          )}

          {isLoggedIn && (
            <>
              <li className="nav-item">
                <Link to="/orders" className="nav-link" onClick={closeMenu}>
                  <FaShoppingCart className="nav-icon" />
                  <span>Orders</span>
                </Link>
              </li>

              {userRole !== 'admin' && (
                <li className="nav-item">
                  <Link to="/custom-order" className="nav-link" onClick={closeMenu}>
                    <FaPenFancy className="nav-icon" />
                    <span>Custom Order</span>
                  </Link>
                </li>
              )}

              {isStaff && (
                <li className="nav-item">
                  <Link to="/inventory" className="nav-link" onClick={closeMenu}>
                    <FaBoxOpen className="nav-icon" />
                    <span>Inventory List</span>
                  </Link>
                </li>
              )}

              {userRole === 'admin' && (
                <li className="nav-item">
                  <Link to="/admin/services" className="nav-link" onClick={closeMenu}>
                    <FaTools className="nav-icon" />
                    <span>Manage Services</span>
                  </Link>
                </li>
              )}

              <li className="nav-item">
                <button className="nav-link logout-btn" onClick={handleLogout}>
                  <FaSignOutAlt className="nav-icon" />
                  <span>Logout</span>
                </button>
              </li>

              <li className="nav-item user-info">
                <span className="user-name">Welcome, {userName}</span>
                <span className="user-role">({userRole})</span>
              </li>
            </>
          )}

          {!isLoggedIn && (
            <>
              <li className="nav-item">
                <Link to="/login" className="nav-link" onClick={closeMenu}>
                  <span>Login</span>
                </Link>
              </li>

              <li className="nav-item">
                <Link to="/register" className="nav-link register-btn" onClick={closeMenu}>
                  <span>Register</span>
                </Link>
              </li>
            </>
          )}

          <li className="nav-item">
            <button
              className="nav-link theme-toggle"
              onClick={toggleTheme}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <FaSun className="nav-icon" /> : <FaMoon className="nav-icon" />}
              <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
