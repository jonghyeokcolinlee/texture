import React from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import SteelMaterial from './materials/Steel';
import WaterMaterial from './materials/Water';

const Home: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="home-container">
      <button className="nav-button" onClick={() => navigate('/steel')}>Brushed Stainless Steel</button>
      <button className="nav-button" onClick={() => navigate('/water')}>Water Ripple Surface</button>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/steel" element={<SteelMaterial />} />
        <Route path="/water" element={<WaterMaterial />} />
      </Routes>
    </Router>
  );
};

export default App;
