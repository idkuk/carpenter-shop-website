import React from 'react';
import './StaticPage.css';

const Terms = () => (
  <div className="static-page">
    <div className="static-hero">
      <h1>Terms of Service</h1>
      <p>These terms define how our services are delivered and managed.</p>
    </div>
    <div className="static-content">
      <h2>Orders & Payments</h2>
      <p>Orders are confirmed after approval and payment arrangements are agreed.</p>

      <h2>Project Timelines</h2>
      <p>Estimated timelines are based on design approvals and material availability.</p>

      <h2>Changes & Cancellations</h2>
      <p>Changes after approval may affect timelines and pricing. Cancellations are reviewed case by case.</p>
    </div>
  </div>
);

export default Terms;
