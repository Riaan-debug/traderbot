const logger = require('../utils/logger');
const signalGenerator = require('./signalGenerator');
const alpaca = require('../config/alpaca');

class AutomatedTrader {
  constructor() {
    this.isRunning = false;
    this.tradingInterval = null;
    this.watchedSymbols = ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'SPY']; // Default watchlist
    this.maxPositionSize = 10; // Maximum shares per trade
    this.minConfidence = 0.7; // Minimum confidence to execute trades
  }

  /**
   * Start automated trading
   * @param {Array} symbols - Symbols to watch
   * @param {number} intervalMinutes - Check interval in minutes
   */
  async startTrading(symbols = null, intervalMinutes = 10) {
    if (this.isRunning) {
      logger.warn('Automated trading is already running');
      return;
    }

    if (symbols) {
      this.watchedSymbols = symbols;
    }

    this.isRunning = true;
    logger.info(`Starting automated trading for symbols: ${this.watchedSymbols.join(', ')}`);
    logger.info(`Check interval: ${intervalMinutes} minutes`);

    // Run immediately
    await this.checkAndExecuteTrades();

    // Set up interval
    this.tradingInterval = setInterval(async () => {
      await this.checkAndExecuteTrades();
    }, intervalMinutes * 60 * 1000);

    logger.info('Automated trading started successfully');
  }

  /**
   * Stop automated trading
   */
  stopTrading() {
    if (!this.isRunning) {
      logger.warn('Automated trading is not running');
      return;
    }

    this.isRunning = false;
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
      this.tradingInterval = null;
    }

    logger.info('Automated trading stopped');
  }

  /**
   * Check signals and execute trades
   */
  async checkAndExecuteTrades() {
    try {
      logger.info('Checking trading signals...');
      
      // Generate signals for all watched symbols
      const signals = await signalGenerator.generateSignalsForSymbols(this.watchedSymbols);
      
      // Filter signals that should be executed
      const executableSignals = signals.filter(signal => 
        signal.shouldExecute && 
        signal.confidence >= this.minConfidence &&
        signal.signal !== 'HOLD'
      );

      logger.info(`Found ${executableSignals.length} executable signals out of ${signals.length} total`);

      // Execute trades for each signal
      for (const signal of executableSignals) {
        await this.executeTradeFromSignal(signal);
        
        // Add delay between trades to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Log summary
      const buySignals = executableSignals.filter(s => s.signal === 'BUY').length;
      const sellSignals = executableSignals.filter(s => s.signal === 'SELL').length;
      
      logger.info(`Trading cycle complete: ${buySignals} BUY signals, ${sellSignals} SELL signals`);

    } catch (error) {
      logger.error('Error in automated trading cycle:', error);
    }
  }

  /**
   * Execute a trade based on a signal
   * @param {Object} signal - Trading signal
   */
  async executeTradeFromSignal(signal) {
    try {
      const positionSize = signalGenerator.getPositionSize(signal.confidence, this.maxPositionSize);
      
      logger.info(`Executing ${signal.signal} order for ${positionSize} shares of ${signal.symbol} (confidence: ${(signal.confidence * 100).toFixed(1)}%)`);

      // Check for existing orders for this symbol first
      const existingOrdersResponse = await alpaca.get('/v2/orders', {
        params: { status: 'open', symbol: signal.symbol }
      });
      
      const existingOrders = existingOrdersResponse.data;
      const oppositeSideOrders = existingOrders.filter(order => 
        order.side !== signal.signal.toLowerCase()
      );
      
      // Cancel opposite side orders to prevent wash trade detection
      if (oppositeSideOrders.length > 0) {
        logger.info(`Cancelling ${oppositeSideOrders.length} opposite side orders for ${signal.symbol} to prevent wash trade`);
        for (const order of oppositeSideOrders) {
          try {
            await alpaca.delete(`/v2/orders/${order.id}`);
            logger.info(`Cancelled order ${order.id} for ${signal.symbol}`);
          } catch (cancelError) {
            logger.warn(`Failed to cancel order ${order.id}:`, cancelError.message);
          }
        }
        // Wait a moment for cancellations to process
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const orderData = {
        symbol: signal.symbol,
        qty: positionSize,
        side: signal.signal.toLowerCase(),
        type: 'market',
        time_in_force: 'day',
        client_order_id: `automation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      // Place the order
      const response = await alpaca.post('/v2/orders', orderData);
      
      logger.info(`Order placed successfully:`, {
        orderId: response.data.id,
        symbol: signal.symbol,
        side: signal.signal,
        qty: positionSize,
        confidence: signal.confidence,
        reason: signal.reason
      });

      return {
        success: true,
        orderId: response.data.id,
        signal: signal,
        positionSize: positionSize
      };

    } catch (error) {
      logger.error(`Failed to execute trade for ${signal.symbol}:`, error.message);
      return {
        success: false,
        error: error.message,
        signal: signal
      };
    }
  }

  /**
   * Get current trading status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      watchedSymbols: this.watchedSymbols,
      maxPositionSize: this.maxPositionSize,
      minConfidence: this.minConfidence,
      nextCheck: this.tradingInterval ? 'Running' : 'Stopped'
    };
  }

  /**
   * Update trading parameters
   * @param {Object} params - New parameters
   */
  updateParameters(params) {
    let updated = false;
    
    if (params.symbols) {
      this.watchedSymbols = params.symbols;
      updated = true;
    }
    if (params.maxPositionSize) {
      this.maxPositionSize = params.maxPositionSize;
      updated = true;
    }
    if (params.minConfidence) {
      this.minConfidence = params.minConfidence;
      updated = true;
    }

    if (updated) {
      logger.info('Trading parameters updated:', {
        symbols: this.watchedSymbols,
        maxPositionSize: this.maxPositionSize,
        minConfidence: this.minConfidence
      });
      
      // If automation is running, log that new parameters will be used in next cycle
      if (this.isRunning) {
        logger.info('New parameters will be applied in the next trading cycle');
      }
    }
  }
}

module.exports = new AutomatedTrader();

