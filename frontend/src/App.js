import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import TradePage from './components/TradePage';
import AutomationDashboard from './components/AutomationDashboard';
import OrderManagement from './components/OrderManagement';
import Navigation from './components/Navigation';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
                  <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/trade" element={<TradePage />} />
          <Route path="/automation" element={<AutomationDashboard />} />
          <Route path="/orders" element={<OrderManagement />} />
        </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

