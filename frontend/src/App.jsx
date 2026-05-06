import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TenderDetail from './pages/TenderDetail';
import ProposalAnalysis from './pages/ProposalAnalysis';

function App() {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
        
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/tender/:tenderId" 
          element={isAuthenticated ? <TenderDetail /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/tender/:tenderId/proposal/:proposalId" 
          element={isAuthenticated ? <ProposalAnalysis /> : <Navigate to="/login" />} 
        />

        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
