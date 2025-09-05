const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const logger = require('../utils/logger');
const signalGenerator = require('../services/signalGenerator');

// CORS headers for all routes
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3002');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  next();
});

// Handle preflight OPTIONS requests for CORS
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3002');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.sendStatus(200);
});

/**
 * GET /api/signals/:symbol
 * Get trading signal for a specific symbol
 */
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Symbol is required'
      });
    }

    logger.info(`Generating signal for ${symbol}`);
    
    const signal = await signalGenerator.generateRSISignal(symbol.toUpperCase());
    
    res.json({
      success: true,
      data: signal
    });

  } catch (error) {
    logger.error('Error generating signal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate signal',
      error: error.message
    });
  }
});

/**
 * POST /api/signals/batch
 * Get trading signals for multiple symbols
 */
router.post('/batch', [
  body('symbols').isArray().withMessage('Symbols must be an array'),
  body('symbols.*').isString().withMessage('Each symbol must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { symbols } = req.body;
    
    if (!symbols || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one symbol is required'
      });
    }

    logger.info(`Generating signals for ${symbols.length} symbols: ${symbols.join(', ')}`);
    
    const signals = await signalGenerator.generateSignalsForSymbols(symbols.map(s => s.toUpperCase()));
    
    res.json({
      success: true,
      data: {
        signals: signals,
        total: signals.length,
        executed: signals.filter(s => s.shouldExecute).length
      }
    });

  } catch (error) {
    logger.error('Error generating batch signals:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate signals',
      error: error.message
    });
  }
});

/**
 * GET /api/signals/indicators/:symbol
 * Get technical indicators for a symbol
 */
router.get('/indicators/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Symbol is required'
      });
    }

    logger.info(`Getting technical indicators for ${symbol}`);
    
    // Generate mock indicators using the signalGenerator
    const indicators = signalGenerator.generateMockIndicators(symbol.toUpperCase());
    
    res.json({
      success: true,
      data: indicators
    });

  } catch (error) {
    logger.error('Error getting technical indicators:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get technical indicators',
      error: error.message
    });
  }
});

/**
 * GET /api/signals/price/:symbol
 * Get current price for a symbol
 */
router.get('/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Symbol is required'
      });
    }

    logger.info(`Getting current price for ${symbol}`);
    
    // Generate mock price data using the signalGenerator
    const indicators = signalGenerator.generateMockIndicators(symbol.toUpperCase());
    const priceData = {
      symbol: symbol.toUpperCase(),
      price: indicators.currentPrice,
      timestamp: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: priceData
    });

  } catch (error) {
    logger.error('Error getting current price:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get current price',
      error: error.message
    });
  }
});

module.exports = router;

