import React from 'react';
import './StaticPage.css';

const Portfolio = () => (
  <div className="static-page">
    <div className="static-hero">
      <h1>Portfolio</h1>
      <p>A snapshot of our recent custom builds and signature projects.</p>
    </div>
    <div className="static-content">
      <div className="portfolio-grid">
        <div className="portfolio-card">
          <h3>Modern Bed Frame</h3>
          <p>Minimal design with solid teak, custom finish, and storage drawers.</p>
        </div>
        <div className="portfolio-card">
          <h3>Executive Office Desk</h3>
          <p>Ergonomic desk with cable management and built-in storage.</p>
        </div>
        <div className="portfolio-card">
          <h3>Dining Set</h3>
          <p>Expandable dining table with six chairs and scratch-resistant coating.</p>
        </div>
        <div className="portfolio-card">
          <h3>Custom Wardrobe</h3>
          <p>Floor-to-ceiling wardrobe with soft-close drawers and LED lighting.</p>
        </div>
      </div>
    </div>
  </div>
);

export default Portfolio;
