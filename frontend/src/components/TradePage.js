import React, { useState } from 'react';
import axios from 'axios';

const TradePage = () => {
  const [formData, setFormData] = useState({
    symbol: '',
    qty: '',
    side: 'buy',
    type: 'market',
    time_in_force: 'day'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.symbol.trim()) {
      setError('Stock symbol is required');
      return false;
    }
    if (!formData.qty || parseFloat(formData.qty) <= 0) {
      setError('Quantity must be a positive number');
      return false;
    }
    if (!['buy', 'sell'].includes(formData.side)) {
      setError('Invalid trade side');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/trading/trade`, formData);
      
      setSuccess({
        message: response.data.message,
        orderId: response.data.data.id
      });
      
      // Reset form
      setFormData({
        symbol: '',
        qty: '',
        side: 'buy',
        type: 'market',
        time_in_force: 'day'
      });
      
    } catch (err) {
      console.error('Error placing trade:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to place trade. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Place Trade</h1>
        <p className="text-gray-600">Buy or sell stocks and ETFs</p>
      </div>

      {/* Trade Form */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Symbol Input */}
          <div>
            <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-2">
              Stock Symbol *
            </label>
            <input
              type="text"
              id="symbol"
              name="symbol"
              value={formData.symbol}
              onChange={handleInputChange}
              placeholder="e.g., AAPL, MSFT, SPY"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              maxLength={10}
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter the stock or ETF symbol (1-10 characters)
            </p>
          </div>

          {/* Quantity Input */}
          <div>
            <label htmlFor="qty" className="block text-sm font-medium text-gray-700 mb-2">
              Quantity *
            </label>
            <input
              type="number"
              id="qty"
              name="qty"
              value={formData.qty}
              onChange={handleInputChange}
              placeholder="e.g., 10"
              step="0.01"
              min="0.01"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              Number of shares to trade
            </p>
          </div>

          {/* Trade Side */}
          <div>
            <label htmlFor="side" className="block text-sm font-medium text-gray-700 mb-2">
              Trade Side *
            </label>
            <select
              id="side"
              name="side"
              value={formData.side}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>

          {/* Order Type */}
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
              Order Type
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="market">Market Order</option>
              <option value="limit">Limit Order</option>
              <option value="stop">Stop Order</option>
              <option value="stop_limit">Stop Limit Order</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Market orders execute immediately at current market price
            </p>
          </div>

          {/* Time in Force */}
          <div>
            <label htmlFor="time_in_force" className="block text-sm font-medium text-gray-700 mb-2">
              Time in Force
            </label>
            <select
              id="time_in_force"
              name="time_in_force"
              value={formData.time_in_force}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="day">Day Order</option>
              <option value="gtc">Good Till Cancelled</option>
              <option value="ioc">Immediate or Cancel</option>
              <option value="fok">Fill or Kill</option>
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Day orders expire at market close
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : formData.side === 'buy'
                  ? 'bg-success-600 hover:bg-success-700'
                  : 'bg-danger-600 hover:bg-danger-700'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Processing...
                </div>
              ) : (
                `${formData.side === 'buy' ? 'Buy' : 'Sell'} ${formData.symbol || 'Stock'}`
              )}
            </button>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Success!</h3>
                <p className="text-sm text-green-700 mt-1">{success.message}</p>
                {success.orderId && (
                  <p className="text-sm text-green-600 mt-1">Order ID: {success.orderId}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Information Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Paper Trading</h3>
              <p className="text-sm text-blue-700 mt-1">
                This is a paper trading account. No real money is at risk.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Market Hours</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Market orders execute during market hours (9:30 AM - 4:00 PM ET).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradePage;

