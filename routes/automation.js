const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const logger = require('../utils/logger');
const automatedTrader = require('../services/automatedTrader');

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
 * GET /api/automation/status
 * Get current automation status
 */
router.get('/status', async (req, res) => {
  try {
    const status = automatedTrader.getStatus();
    
    res.json({
      success: true,
      data: status
    });

  } catch (error) {
    logger.error('Error getting automation status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get automation status',
      error: error.message
    });
  }
});

/**
 * POST /api/automation/start
 * Start automated trading
 */
router.post('/start', [
  body('symbols').optional().isArray().withMessage('Symbols must be an array'),
  body('symbols.*').optional().isString().withMessage('Each symbol must be a string'),
  body('intervalMinutes').optional().isInt({ min: 1, max: 1440 }).withMessage('Interval must be between 1 and 1440 minutes')
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

    const { symbols, intervalMinutes = 10 } = req.body;
    
    await automatedTrader.startTrading(symbols, intervalMinutes);
    
    res.json({
      success: true,
      message: 'Automated trading started successfully',
      data: automatedTrader.getStatus()
    });

  } catch (error) {
    logger.error('Error starting automated trading:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start automated trading',
      error: error.message
    });
  }
});

/**
 * POST /api/automation/stop
 * Stop automated trading
 */
router.post('/stop', async (req, res) => {
  try {
    automatedTrader.stopTrading();
    
    res.json({
      success: true,
      message: 'Automated trading stopped successfully',
      data: automatedTrader.getStatus()
    });

  } catch (error) {
    logger.error('Error stopping automated trading:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to stop automated trading',
      error: error.message
    });
  }
});

/**
 * PUT /api/automation/parameters
 * Update trading parameters
 */
router.put('/parameters', [
  body('symbols').optional().isArray().withMessage('Symbols must be an array'),
  body('symbols.*').optional().isString().withMessage('Each symbol must be a string'),
  body('maxPositionSize').optional().isInt({ min: 1, max: 100 }).withMessage('Max position size must be between 1 and 100'),
  body('minConfidence').optional().isFloat({ min: 0, max: 1 }).withMessage('Min confidence must be between 0 and 1'),
  body('rsiOversold').optional().isInt({ min: 10, max: 40 }).withMessage('RSI oversold must be between 10 and 40'),
  body('rsiOverbought').optional().isInt({ min: 60, max: 90 }).withMessage('RSI overbought must be between 60 and 90')
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

    const { symbols, maxPositionSize, minConfidence, rsiOversold, rsiOverbought } = req.body;
    
    // Update automated trader parameters
    automatedTrader.updateParameters({
      symbols,
      maxPositionSize,
      minConfidence
    });

    // Update signal generator RSI thresholds
    if (rsiOversold !== undefined && rsiOverbought !== undefined) {
      const signalGenerator = require('../services/signalGenerator');
      signalGenerator.updateRSIThresholds(rsiOversold, rsiOverbought);
    }
    
    res.json({
      success: true,
      message: 'Trading parameters updated successfully',
      data: automatedTrader.getStatus()
    });

  } catch (error) {
    logger.error('Error updating trading parameters:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update trading parameters',
      error: error.message
    });
  }
});

/**
 * POST /api/automation/check
 * Manually trigger a trading check
 */
router.post('/check', async (req, res) => {
  try {
    await automatedTrader.checkAndExecuteTrades();
    
    res.json({
      success: true,
      message: 'Trading check completed successfully'
    });

  } catch (error) {
    logger.error('Error in manual trading check:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to complete trading check',
      error: error.message
    });
  }
});

module.exports = router;
