import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaInstagram, FaWhatsapp, FaPhone, FaEnvelope, FaMapMarkerAlt } from 'react-icons/fa';
import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3 className="footer-title">WoodWork Hub</h3>
          <p className="footer-description">
            Custom furniture crafted with precision and care.
            Transforming your vision into beautiful, functional pieces.
          </p>
          <Link to="/" className="social-link"><FaFacebook /></Link>
          <Link to="/" className="social-link"><FaInstagram /></Link>
          <Link to="/" className="social-link"><FaWhatsapp /></Link>

        </div>

        <div className="footer-section">
          <h3 className="footer-title">Quick Links</h3>
          <ul className="footer-links">
            <li><Link to="/services">Our Services</Link></li>
            <li><Link to="/portfolio">Portfolio</Link></li>
            <li><Link to="/about">About Us</Link></li>
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/terms">Terms of Service</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h3 className="footer-title">Contact Us</h3>
          <div className="contact-info">
            <div className="contact-item">
              <FaPhone className="contact-icon" />
              <span>+91 90297 66741</span>
            </div>
            <div className="contact-item">
              <FaEnvelope className="contact-icon" />
              <span>carpenteradmin@gmail.com</span>
            </div>
            <div className="contact-item">
              <FaMapMarkerAlt className="contact-icon" />
              <span> Near Brahmand Phase 5, opposite to Apollo Pharmecy,Azad Nagar,Thane (W)-400607</span>
            </div>
          </div>
        </div>

        <div className="footer-section">
          <h3 className="footer-title">Business Hours</h3>
          <div className="business-hours">
            <p><strong>Monday - Friday:</strong> 9:00 AM - 7:00 PM</p>
            <p><strong>Saturday:</strong> 10:00 AM - 5:00 PM</p>
            <p><strong>Sunday:</strong> Closed</p>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} WoodWork Hub Management System. All rights reserved.</p>
        <p>Developed as B.Sc. Computer Science Capstone Project</p>
      </div>
    </footer>
  );
};

export default Footer;
