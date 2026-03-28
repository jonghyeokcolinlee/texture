import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';

import SteelMaterial from './materials/Steel';
import Steel1 from './materials/Steel1';
import Steel2 from './materials/Steel2';

import WaterMaterial from './materials/Water';
import Water1 from './materials/Water1';
import Water2 from './materials/Water2';
import Water3 from './materials/Water3';

const Home: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="home-container">
      <div className="material-section">
        <button className="nav-button main-button" onClick={() => navigate('/steel')}>
          Brushed Stainless Steel
        </button>
        <div className="version-links">
          <span className="version-label">Research:</span>
          <button className="nav-button subtle-button" onClick={() => navigate('/steel/1')}>v1 (Basic)</button>
          <button className="nav-button subtle-button" onClick={() => navigate('/steel/2')}>v2 (Contrast/Waves)</button>
        </div>
      </div>

      <div className="material-section">
        <button className="nav-button main-button" onClick={() => navigate('/water')}>
          Water Ripple Surface
        </button>
        <div className="version-links">
          <span className="version-label">Research:</span>
          <button className="nav-button subtle-button" onClick={() => navigate('/water/1')}>v1 (Sine Wave)</button>
          <button className="nav-button subtle-button" onClick={() => navigate('/water/2')}>v2 (Harsh Reflex)</button>
          <button className="nav-button subtle-button" onClick={() => navigate('/water/3')}>v3 (Soft Spread)</button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />

        {/* Latest */}
        <Route path="/steel" element={<SteelMaterial />} />
        <Route path="/water" element={<WaterMaterial />} />

        {/* Versions */}
        <Route path="/steel/1" element={<Steel1 />} />
        <Route path="/steel/2" element={<Steel2 />} />

        <Route path="/water/1" element={<Water1 />} />
        <Route path="/water/2" element={<Water2 />} />
        <Route path="/water/3" element={<Water3 />} />
      </Routes>
    </Router>
  );
};

export default App;
