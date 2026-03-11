import React from 'react';
import './StaticPage.css';

const Contact = () => (
  <div className="static-page">
    <div className="static-hero">
      <h1>Contact Us</h1>
      <p>Have a project in mind? Reach out and our team will respond quickly.</p>
    </div>
    <div className="static-content">
      <div className="contact-grid">
        <div className="contact-card">
          <h2>Get in Touch</h2>
          <p>Phone: +91 90297 66741</p>
          <p>Email: carpenteradmin@gmail.com</p>
          <p>Address: Near Brahmand Phase 5, opposite to Apollo Pharmecy,Azad Nagar,Thane (W)-400607</p>
          <p>Business Hours: Mon-Fri 9:00 AM - 7:00 PM</p>
        </div>
        <form className="contact-form">
          <input type="text" placeholder="Full Name" />
          <input type="email" placeholder="Email Address" />
          <input type="text" placeholder="Phone Number" />
          <textarea rows="4" placeholder="Tell us about your project"></textarea>
          <button type="button" className="btn-primary">Send Message</button>
        </form>
      </div>
      <p className="form-note">Form submission is a demo placeholder in this MVP.</p>
    </div>
  </div>
);

export default Contact;
