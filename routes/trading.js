const express = require('express');
const { body, validationResult } = require('express-validator');
const alpacaApi = require('../config/alpaca');
const logger = require('../utils/logger');
const XLSX = require('xlsx');

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
    
    // Check for existing opposite side orders to prevent wash trade detection
    const existingOrdersResponse = await alpacaApi.get('/v2/orders', {
      params: { status: 'open', symbol: symbol.toUpperCase() }
    });
    
    const existingOrders = existingOrdersResponse.data;
    const oppositeSideOrders = existingOrders.filter(order => 
      order.side !== side.toLowerCase()
    );
    
    // Cancel opposite side orders to prevent wash trade detection
    if (oppositeSideOrders.length > 0) {
      logger.info(`Cancelling ${oppositeSideOrders.length} opposite side orders for ${symbol} to prevent wash trade`);
      for (const order of oppositeSideOrders) {
        try {
          await alpacaApi.delete(`/v2/orders/${order.id}`);
          logger.info(`Cancelled order ${order.id} for ${symbol}`);
        } catch (cancelError) {
          logger.warn(`Failed to cancel order ${order.id}:`, cancelError.message);
        }
      }
      // Wait a moment for cancellations to process
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
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
      time_in_force: time_in_force,
      client_order_id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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

/**
 * GET /api/trading/orders
 * Get all orders (pending and recent)
 */
router.get('/orders', async (req, res) => {
  try {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', 'http://localhost:3002');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    const { status = 'all', limit = 50 } = req.query;
    
    let url = '/v2/orders';
    const params = new URLSearchParams();
    
    if (status !== 'all') {
      params.append('status', status);
    }
    if (limit) {
      params.append('limit', limit);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await alpacaApi.get(url);
    const orders = response.data;
    
    // Categorize orders by source
    const categorizedOrders = orders.map(order => {
      const isAutomation = order.client_order_id && order.client_order_id.startsWith('automation_');
      const isManual = order.client_order_id && order.client_order_id.startsWith('manual_');
      
      // For orders without client_order_id, try to categorize based on other characteristics
      let source = 'unknown';
      if (isAutomation) {
        source = 'automation';
      } else if (isManual) {
        source = 'manual';
      } else {
        // For orders without client_order_id, we'll categorize them as "legacy" 
        // and show them in a separate section
        source = 'legacy';
      }
      
      return {
        ...order,
        source: source,
        qty: parseFloat(order.qty),
        filled_qty: parseFloat(order.filled_qty || 0),
        filled_avg_price: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
        limit_price: order.limit_price ? parseFloat(order.limit_price) : null,
        stop_price: order.stop_price ? parseFloat(order.stop_price) : null
      };
    });
    
    res.json({
      success: true,
      data: categorizedOrders
    });
    
  } catch (error) {
    logger.error('Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orders',
      message: error.message
    });
  }
});

/**
 * DELETE /api/trading/orders/:orderId
 * Cancel a specific order
 */
router.delete('/orders/:orderId', async (req, res) => {
  try {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', 'http://localhost:3002');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    const { orderId } = req.params;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }
    
    const response = await alpacaApi.delete(`/v2/orders/${orderId}`);
    
    logger.info(`Order ${orderId} cancelled successfully`);
    
    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: response.data
    });
    
  } catch (error) {
    logger.error(`Error cancelling order ${req.params.orderId}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel order',
      message: error.message
    });
  }
});

/**
 * DELETE /api/trading/orders
 * Cancel all orders
 */
router.delete('/orders', async (req, res) => {
  try {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', 'http://localhost:3002');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    const { source } = req.query; // 'automation', 'manual', or 'all'
    
    // Get all pending orders first
    const ordersResponse = await alpacaApi.get('/v2/orders?status=open');
    const orders = ordersResponse.data;
    
    // Filter by source if specified
    let ordersToCancel = orders;
    if (source && source !== 'all') {
      ordersToCancel = orders.filter(order => {
        const isAutomation = order.client_order_id && order.client_order_id.startsWith('automation_');
        const isManual = order.client_order_id && order.client_order_id.startsWith('manual_');
        
        if (source === 'automation') return isAutomation;
        if (source === 'manual') return isManual;
        return true;
      });
    }
    
    // Cancel all filtered orders
    const cancelPromises = ordersToCancel.map(order => 
      alpacaApi.delete(`/v2/orders/${order.id}`).catch(err => {
        logger.warn(`Failed to cancel order ${order.id}:`, err.message);
        return { id: order.id, error: err.message };
      })
    );
    
    const results = await Promise.all(cancelPromises);
    const successful = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;
    
    logger.info(`Cancelled ${successful} orders, ${failed} failed`);
    
    res.json({
      success: true,
      message: `Cancelled ${successful} orders successfully`,
      data: {
        cancelled: successful,
        failed: failed,
        total: ordersToCancel.length
      }
    });
    
  } catch (error) {
    logger.error('Error cancelling orders:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel orders',
      message: error.message
    });
  }
});

/**
 * GET /api/trading/export
 * Export trade history to Excel
 */
router.get('/export', async (req, res) => {
  try {
    // Set CORS headers
    res.header('Access-Control-Allow-Origin', 'http://localhost:3002');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    
    const { period = '1day', format = 'excel' } = req.query;
    
    logger.info(`Exporting trade history. Period: ${period}, Format: ${format}`);
    
    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case '1day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '1week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '3months':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '1year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    // Get orders from Alpaca
    const response = await alpacaApi.get('/v2/orders', {
      params: {
        status: 'all',
        after: startDate.toISOString(),
        limit: 1000
      }
    });
    
    const orders = response.data.map(order => ({
      id: order.id,
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      qty: parseFloat(order.qty),
      filled_qty: parseFloat(order.filled_qty || 0),
      filled_avg_price: order.filled_avg_price ? parseFloat(order.filled_avg_price) : null,
      status: order.status,
      created_at: order.created_at,
      filled_at: order.filled_at,
      submitted_at: order.submitted_at,
      client_order_id: order.client_order_id
    }));
    
    if (format === 'excel') {
      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Prepare data for Excel
      const excelData = orders.map(order => ({
        'Order ID': order.id,
        'Symbol': order.symbol,
        'Side': order.side,
        'Quantity': order.qty,
        'Price': order.filled_avg_price || order.limit_price || order.stop_price || 'Market',
        'Status': order.status,
        'Order Type': order.type,
        'Time in Force': order.time_in_force || 'N/A',
        'Created At': new Date(order.created_at).toLocaleString(),
        'Filled At': order.filled_at ? new Date(order.filled_at).toLocaleString() : 'Not Filled',
        'Filled Quantity': order.filled_qty || 0,
        'Remaining Quantity': order.qty - (order.filled_qty || 0),
        'Client Order ID': order.client_order_id || 'N/A'
      }));
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Trade History');
      
      // Generate Excel buffer
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Set headers for Excel download
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="trade-history-${period}-${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.setHeader('Content-Length', excelBuffer.length);
      
      // Send Excel file
      res.send(excelBuffer);
    } else {
      res.json({
        success: true,
        data: orders,
        period: period,
        exported_at: new Date().toISOString(),
        total_orders: orders.length
      });
    }
    
  } catch (error) {
    logger.error('Error exporting trade history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export trade history',
      message: error.message
    });
  }
});

module.exports = router;

