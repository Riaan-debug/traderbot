import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5001';

const AutomationDashboard = () => {
  const [automationStatus, setAutomationStatus] = useState(null);
  const [signals, setSignals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Default symbols to watch
  const defaultSymbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'SPY'];
  const [watchlist, setWatchlist] = useState(defaultSymbols.join(', '));
  
  // Trading parameters
  const [tradingParams, setTradingParams] = useState({
    minConfidence: 70,
    maxPositionSize: 10,
    rsiOversold: 30,
    rsiOverbought: 70
  });

  useEffect(() => {
    fetchAutomationStatus();
    fetchSignals();
  }, []);

  const fetchAutomationStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/automation/status`);
      setAutomationStatus(response.data.data);
    } catch (error) {
      console.error('Error fetching automation status:', error);
    }
  };

  const fetchSignals = async () => {
    try {
      const symbols = watchlist.split(',').map(s => s.trim()).filter(s => s);
      if (symbols.length === 0) return;

      const response = await axios.post(`${API_BASE_URL}/api/signals/batch`, {
        symbols: symbols
      });
      setSignals(response.data.data.signals);
    } catch (error) {
      console.error('Error fetching signals:', error);
      setError('Failed to fetch trading signals');
    }
  };

  const startAutomation = async () => {
    setLoading(true);
    setError('');
    try {
      const symbols = watchlist.split(',').map(s => s.trim()).filter(s => s);
      
      const response = await axios.post(`${API_BASE_URL}/api/automation/start`, {
        symbols: symbols,
        intervalMinutes: 10
      });
      
      setSuccess('Automated trading started successfully!');
      setAutomationStatus(response.data.data);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to start automated trading: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const stopAutomation = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post(`${API_BASE_URL}/api/automation/stop`);
      setSuccess('Automated trading stopped successfully!');
      setAutomationStatus(response.data.data);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to stop automated trading: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const checkSignals = async () => {
    setLoading(true);
    try {
      await fetchSignals();
      setSuccess('Signals refreshed!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to refresh signals');
    } finally {
      setLoading(false);
    }
  };

  const updateTradingParameters = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.put(`${API_BASE_URL}/api/automation/parameters`, {
        minConfidence: tradingParams.minConfidence / 100, // Convert to decimal
        maxPositionSize: tradingParams.maxPositionSize,
        rsiOversold: tradingParams.rsiOversold,
        rsiOverbought: tradingParams.rsiOverbought
      });
      
      setSuccess('Trading parameters updated successfully!');
      setAutomationStatus(response.data.data);
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to update trading parameters: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getSignalColor = (signal) => {
    switch (signal) {
      case 'BUY': return 'text-green-600 bg-green-100';
      case 'SELL': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Automated Trading Dashboard</h1>
        <p className="text-gray-600">Monitor and control your automated trading system</p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Automation Control Panel */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Automation Control</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Status */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Current Status</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${automationStatus?.isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">
                {automationStatus?.isRunning ? 'Running' : 'Stopped'}
              </span>
            </div>
            {automationStatus && (
              <div className="mt-2 text-sm text-gray-600">
                <p>Watching: {automationStatus.watchedSymbols?.join(', ')}</p>
                <p>Max Position: {automationStatus.maxPositionSize} shares</p>
                <p>Min Confidence: {(automationStatus.minConfidence * 100).toFixed(0)}%</p>
              </div>
            )}
          </div>

          {/* Controls */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Controls</h3>
            <div className="space-y-2">
              <button
                onClick={startAutomation}
                disabled={loading || automationStatus?.isRunning}
                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Starting...' : 'Start Automation'}
              </button>
              <button
                onClick={stopAutomation}
                disabled={loading || !automationStatus?.isRunning}
                className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Stopping...' : 'Stop Automation'}
              </button>
              <button
                onClick={checkSignals}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Checking...' : 'Check Signals Now'}
              </button>
            </div>
          </div>
        </div>

        {/* Watchlist Configuration */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Watchlist (comma-separated symbols)
          </label>
          <input
            type="text"
            value={watchlist}
            onChange={(e) => setWatchlist(e.target.value)}
            placeholder="AAPL, MSFT, GOOGL, TSLA, SPY"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Trading Parameters Settings */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Trading Parameters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Confidence Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Minimum Confidence: {tradingParams.minConfidence}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={tradingParams.minConfidence}
              onChange={(e) => setTradingParams({...tradingParams, minConfidence: parseInt(e.target.value)})}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0% (More Trades)</span>
              <span>100% (Fewer Trades)</span>
            </div>
          </div>

          {/* Position Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Position Size: {tradingParams.maxPositionSize} shares
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={tradingParams.maxPositionSize}
              onChange={(e) => setTradingParams({...tradingParams, maxPositionSize: parseInt(e.target.value)})}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 share</span>
              <span>50 shares</span>
            </div>
          </div>

          {/* RSI Oversold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RSI Oversold (Buy Signal): {tradingParams.rsiOversold}
            </label>
            <input
              type="range"
              min="10"
              max="40"
              value={tradingParams.rsiOversold}
              onChange={(e) => setTradingParams({...tradingParams, rsiOversold: parseInt(e.target.value)})}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>10 (More Sensitive)</span>
              <span>40 (Less Sensitive)</span>
            </div>
          </div>

          {/* RSI Overbought */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              RSI Overbought (Sell Signal): {tradingParams.rsiOverbought}
            </label>
            <input
              type="range"
              min="60"
              max="90"
              value={tradingParams.rsiOverbought}
              onChange={(e) => setTradingParams({...tradingParams, rsiOverbought: parseInt(e.target.value)})}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>60 (Less Sensitive)</span>
              <span>90 (More Sensitive)</span>
            </div>
          </div>
        </div>

        {/* Update Button */}
        <div className="mt-6">
          <button
            onClick={updateTradingParameters}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Updating...' : 'Update Parameters'}
          </button>
        </div>
      </div>

      {/* Trading Signals */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Trading Signals</h2>
          <button
            onClick={fetchSignals}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Refresh
          </button>
        </div>

        {signals.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No signals available. Click "Check Signals Now" to generate signals.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Signal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RSI
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {signals.map((signal, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {signal.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSignalColor(signal.signal)}`}>
                        {signal.signal}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${getConfidenceColor(signal.confidence)}`}>
                        {(signal.confidence * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ${signal.indicators?.currentPrice?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {signal.indicators?.rsi?.toFixed(2) || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {signal.shouldExecute ? (
                        <span className="text-green-600 font-medium">Will Execute</span>
                      ) : (
                        <span className="text-gray-500">Hold</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomationDashboard;
