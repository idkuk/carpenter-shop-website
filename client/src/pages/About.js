import React from 'react';
import './StaticPage.css';

const About = () => (
  <div className="static-page">
    <div className="static-hero">
      <h1>About Carpenter Shop</h1>
      <p>We craft custom furniture that blends classic workmanship with modern design.</p>
    </div>
    <div className="static-content">
      <h2>Our Story</h2>
      <p>
        Carpenter Shop started as a small workshop and grew into a trusted team for
        custom furniture and interior projects. We focus on quality materials,
        clean craftsmanship, and clear communication throughout each order.
      </p>

      <h2>What We Build</h2>
      <ul>
        <li>Custom beds, wardrobes, and storage solutions</li>
        <li>Dining tables, chairs, and living room furniture</li>
        <li>Office desks and professional workspaces</li>
        <li>Kitchen and modular cabinet projects</li>
      </ul>

      <h2>Why Choose Us</h2>
      <p>
        We treat every project like a collaboration. From initial measurements to final
        delivery, our team keeps you informed and ensures every detail matches your vision.
      </p>
    </div>
  </div>
);

export default About;
