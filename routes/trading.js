const express = require('express');
const { body, validationResult } = require('express-validator');
const alpacaApi = require('../config/alpaca');
const logger = require('../utils/logger');

const router = express.Router();

// Handle preflight OPTIONS requests for CORS
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3002');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.sendStatus(200);
});

// Input validation middleware for trade orders
const validateTradeOrder = [
  body('symbol')
    .trim()
    .isLength({ min: 1, max: 10 })
    .matches(/^[A-Z]+$/)
    .withMessage('Symbol must be 1-10 uppercase letters'),
  body('qty')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be a positive number'),
  body('side')
    .isIn(['buy', 'sell'])
    .withMessage('Side must be either "buy" or "sell"'),
  body('type')
    .optional()
    .isIn(['market', 'limit', 'stop', 'stop_limit'])
    .withMessage('Invalid order type'),
  body('time_in_force')
    .optional()
    .isIn(['day', 'gtc', 'ioc', 'fok'])
    .withMessage('Invalid time in force value')
];

// GET /portfolio - Fetch current portfolio and balances
router.get('/portfolio', async (req, res) => {
  try {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', 'http://localhost:3002');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    logger.info('Fetching portfolio information');
    
    // Get account information
    const accountResponse = await alpacaApi.get('/v2/account');
    const account = accountResponse.data;
    
    // Get current positions
    const positionsResponse = await alpacaApi.get('/v2/positions');
    const positions = positionsResponse.data;
    
    // Get portfolio value history (last 30 days)
    const portfolioHistoryResponse = await alpacaApi.get('/v2/account/portfolio/history', {
      params: {
        period: '30D',
        timeframe: '1D'
      }
    });
    
    const portfolio = {
      account: {
        id: account.id,
        account_number: account.account_number,
        status: account.status,
        cash: parseFloat(account.cash),
        portfolio_value: parseFloat(account.portfolio_value),
        buying_power: parseFloat(account.buying_power),
        daytrade_count: account.daytrade_count,
        daytrading_buying_power: parseFloat(account.daytrading_buying_power)
      },
      positions: positions.map(pos => ({
        symbol: pos.symbol,
        qty: parseFloat(pos.qty),
        market_value: parseFloat(pos.market_value),
        avg_entry_price: parseFloat(pos.avg_entry_price),
        current_price: parseFloat(pos.current_price),
        unrealized_pl: parseFloat(pos.unrealized_pl),
        unrealized_plpc: parseFloat(pos.unrealized_plpc)
      })),
      portfolio_history: portfolioHistoryResponse.data
    };
    
    logger.info('Portfolio information retrieved successfully');
    res.json({
      success: true,
      data: portfolio,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error fetching portfolio:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch portfolio information',
      message: error.message
    });
  }
});

// GET /history - Fetch trade history
router.get('/history', async (req, res) => {
  try {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', 'http://localhost:3002');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    const { limit = 100, offset = 0, symbol } = req.query;
    
    logger.info(`Fetching trade history. Limit: ${limit}, Offset: ${offset}, Symbol: ${symbol || 'all'}`);
    
    const params = {
      limit: Math.min(parseInt(limit), 500), // Max 500 per request
      offset: parseInt(offset)
    };
    
    if (symbol) {
      params.symbol = symbol.toUpperCase();
    }
    
    const response = await alpacaApi.get('/v2/orders', { params });
    
    const orders = response.data.map(order => ({
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      qty: parseFloat(order.qty),
      filled_qty: parseFloat(order.filled_qty),
      filled_avg_price: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
      status: order.status,
      created_at: order.created_at,
      filled_at: order.filled_at,
      submitted_at: order.submitted_at
    }));
    
    logger.info(`Trade history retrieved successfully. Found ${orders.length} orders`);
    res.json({
      success: true,
      data: orders,
      pagination: {
        limit: params.limit,
        offset: params.offset,
        total: orders.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error fetching trade history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trade history',
      message: error.message
    });
  }
});

// POST /trade - Place a trade order
router.post('/trade', validateTradeOrder, async (req, res) => {
  try {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', 'http://localhost:3002');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      logger.warn('Trade order validation failed:', errors.array());
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }
    
    const { symbol, qty, side, type = 'market', time_in_force = 'day' } = req.body;
    
    logger.info(`Placing ${side} order for ${qty} shares of ${symbol}`);
    
    // Check if we have enough buying power for buy orders
    if (side === 'buy') {
      const accountResponse = await alpacaApi.get('/v2/account');
      const account = accountResponse.data;
      const estimatedCost = qty * 100; // Rough estimate, could be improved with real-time price
      
      if (parseFloat(account.buying_power) < estimatedCost) {
        logger.warn(`Insufficient buying power for ${symbol} order`);
        return res.status(400).json({
          success: false,
          error: 'Insufficient buying power',
          required: estimatedCost,
          available: parseFloat(account.buying_power)
        });
      }
    }
    
    // Place the order
    const orderData = {
      symbol: symbol.toUpperCase(),
      qty: qty.toString(),
      side: side,
      type: type,
      time_in_force: time_in_force
    };
    
    const response = await alpacaApi.post('/v2/orders', orderData);
    const order = response.data;
    
    logger.info(`Order placed successfully. Order ID: ${order.id}`);
    
    res.status(201).json({
      success: true,
      data: {
        id: order.id,
        symbol: order.symbol,
        side: order.side,
        type: order.type,
        qty: parseFloat(order.qty),
        status: order.status,
        created_at: order.created_at,
        submitted_at: order.submitted_at
      },
      message: `${side.toUpperCase()} order for ${qty} shares of ${symbol} placed successfully`,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error placing trade order:', error);
    
    // Handle specific Alpaca API errors
    if (error.response?.status === 422) {
      return res.status(400).json({
        success: false,
        error: 'Invalid order parameters',
        message: error.response.data.message || 'Order validation failed'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to place trade order',
      message: error.message
    });
  }
});

module.exports = router;

