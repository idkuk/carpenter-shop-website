import React from 'react';
import './StaticPage.css';

const Privacy = () => (
  <div className="static-page">
    <div className="static-hero">
      <h1>Privacy Policy</h1>
      <p>We respect your privacy and protect your data.</p>
    </div>
    <div className="static-content">
      <h2>Information We Collect</h2>
      <p>We collect basic contact details and order information to deliver your projects.</p>

      <h2>How We Use Data</h2>
      <p>Your data is used only for order management, communication, and service updates.</p>

      <h2>Data Security</h2>
      <p>We use secure systems and role-based access to protect sensitive information.</p>
    </div>
  </div>
);

export default Privacy;
