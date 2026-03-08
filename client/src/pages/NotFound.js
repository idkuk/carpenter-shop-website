import React from 'react';
import { Link } from 'react-router-dom';
import './StaticPage.css';

const NotFound = () => (
  <div className="static-page">
    <div className="static-hero">
      <h1>Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/services" className="btn-primary">Go to Services</Link>
    </div>
  </div>
);

export default NotFound;
