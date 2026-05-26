import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UniversalNavigationBar from './Universals/UniversalNavigationBar';
import Dashboard from './pages/Dashboard';
import Layer1India from './Layer 1 Ind & US/Layer1India';
import Income from './Income/Income';
import JurisdictionRouter from './Router/JurisdictionRouter';

function App() {
  return (
    <Router>
      <div className="bg-[#050505] min-h-screen text-white antialiased selection:bg-brandGold selection:text-black">
        <UniversalNavigationBar />
        <Routes>
          <Route path="/" element={<Navigate to="/router" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/layer1-india" element={<Layer1India />} />
          <Route path="/income" element={<Income />} />
          <Route path="/router" element={<JurisdictionRouter />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
