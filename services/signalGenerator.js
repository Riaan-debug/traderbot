const logger = require('../utils/logger');

class SignalGenerator {
  constructor() {
    this.rsiOversold = 30;  // RSI below 30 = oversold (buy signal)
    this.rsiOverbought = 70; // RSI above 70 = overbought (sell signal)
    this.minConfidence = 0.6; // Minimum confidence for signal execution
  }

  /**
   * Update RSI thresholds
   * @param {number} oversold - RSI oversold threshold
   * @param {number} overbought - RSI overbought threshold
   */
  updateRSIThresholds(oversold, overbought) {
    this.rsiOversold = oversold;
    this.rsiOverbought = overbought;
    logger.info(`RSI thresholds updated: oversold=${oversold}, overbought=${overbought}`);
  }

  /**
   * Generate mock technical indicators for testing
   * @param {string} symbol - Stock symbol
   * @returns {Object} Mock indicators
   */
  generateMockIndicators(symbol) {
    // Use time-based seed for consistent but changing data
    const timeBasedSeed = Math.floor(Date.now() / (1000 * 60 * 5)); // Change every 5 minutes
    const symbolHash = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const seed = (timeBasedSeed + symbolHash) % 1000;
    
    // Generate RSI between 20-80 with some randomness
    const rsi = 20 + (seed % 60) + Math.sin(seed * 0.1) * 10;
    
    // Generate price around $100-200
    const basePrice = 100 + (seed % 100);
    const currentPrice = basePrice + Math.sin(seed * 0.05) * 20;
    
    return {
      rsi: Math.max(0, Math.min(100, rsi)),
      sma20: currentPrice + (Math.random() - 0.5) * 10,
      sma50: currentPrice + (Math.random() - 0.5) * 15,
      currentPrice: currentPrice,
      isMockData: true
    };
  }

  /**
   * Generate trading signal based on RSI strategy
   * @param {string} symbol - Stock symbol
   * @returns {Promise<Object>} Trading signal
   */
  async generateRSISignal(symbol) {
    try {
      logger.info(`Generating RSI signal for ${symbol}`);
      
      // Generate mock technical indicators for now
      const indicators = this.generateMockIndicators(symbol);
      
      // Calculate signal strength and confidence
      let signal = 'HOLD';
      let confidence = 0;
      let reason = '';

      // RSI-based signals
      if (indicators.rsi < this.rsiOversold) {
        signal = 'BUY';
        confidence = this.calculateBuyConfidence(indicators);
        reason = `RSI oversold (${indicators.rsi.toFixed(2)} < ${this.rsiOversold})`;
      } else if (indicators.rsi > this.rsiOverbought) {
        signal = 'SELL';
        confidence = this.calculateSellConfidence(indicators);
        reason = `RSI overbought (${indicators.rsi.toFixed(2)} > ${this.rsiOverbought})`;
      } else {
        reason = `RSI neutral (${indicators.rsi.toFixed(2)})`;
        
        // For mock data, occasionally generate BUY/SELL signals for testing
        // (Only when using mock data - real market data will generate signals based on actual RSI)
        if (indicators.isMockData) {
          const timeBasedSeed = Math.floor(Date.now() / (1000 * 60 * 3)); // Change every 3 minutes
          const symbolHash = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
          const randomFactor = ((timeBasedSeed + symbolHash) % 100) / 100;
          
          // 25% chance of generating a BUY/SELL signal for testing
          if (randomFactor < 0.25) {
            if (randomFactor < 0.125) {
              signal = 'BUY';
              confidence = 0.5 + (randomFactor * 0.3); // 50-80% confidence
              reason = `Mock BUY signal for testing (RSI: ${indicators.rsi.toFixed(2)})`;
            } else {
              signal = 'SELL';
              confidence = 0.5 + ((randomFactor - 0.125) * 2.4); // 50-80% confidence
              reason = `Mock SELL signal for testing (RSI: ${indicators.rsi.toFixed(2)})`;
            }
          }
        }
      }

      // Additional confirmation from moving averages
      if (signal === 'BUY' && indicators.currentPrice > indicators.sma20) {
        confidence += 0.1; // Boost confidence if price above SMA20
        reason += ' + Price above SMA20';
      } else if (signal === 'SELL' && indicators.currentPrice < indicators.sma20) {
        confidence += 0.1; // Boost confidence if price below SMA20
        reason += ' + Price below SMA20';
      }

      const result = {
        symbol: symbol,
        signal: signal,
        confidence: Math.min(confidence, 1.0), // Cap at 1.0
        reason: reason,
        indicators: {
          rsi: indicators.rsi,
          sma20: indicators.sma20,
          sma50: indicators.sma50,
          currentPrice: indicators.currentPrice
        },
        timestamp: new Date(),
        shouldExecute: confidence >= this.minConfidence
      };

      logger.info(`RSI Signal for ${symbol}: ${signal} (confidence: ${(confidence * 100).toFixed(1)}%)`);
      return result;

    } catch (error) {
      logger.error(`Error generating RSI signal for ${symbol}:`, error.message);
      return {
        symbol: symbol,
        signal: 'HOLD',
        confidence: 0,
        reason: `Error: ${error.message}`,
        timestamp: new Date(),
        shouldExecute: false
      };
    }
  }

  /**
   * Calculate buy signal confidence
   * @param {Object} indicators - Technical indicators
   * @returns {number} Confidence score (0-1)
   */
  calculateBuyConfidence(indicators) {
    let confidence = 0.6; // Base confidence for RSI oversold

    // RSI strength (lower RSI = higher confidence)
    const rsiStrength = (this.rsiOversold - indicators.rsi) / this.rsiOversold;
    confidence += rsiStrength * 0.3; // Increased from 0.2 to 0.3

    // Moving average alignment
    if (indicators.currentPrice > indicators.sma20) {
      confidence += 0.1;
    }
    if (indicators.sma20 > indicators.sma50) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Calculate sell signal confidence
   * @param {Object} indicators - Technical indicators
   * @returns {number} Confidence score (0-1)
   */
  calculateSellConfidence(indicators) {
    let confidence = 0.6; // Base confidence for RSI overbought

    // RSI strength (higher RSI = higher confidence)
    const rsiStrength = (indicators.rsi - this.rsiOverbought) / (100 - this.rsiOverbought);
    confidence += rsiStrength * 0.3; // Increased from 0.2 to 0.3

    // Moving average alignment
    if (indicators.currentPrice < indicators.sma20) {
      confidence += 0.1;
    }
    if (indicators.sma20 < indicators.sma50) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Generate signals for multiple symbols
   * @param {Array} symbols - Array of stock symbols
   * @returns {Promise<Array>} Array of trading signals
   */
  async generateSignalsForSymbols(symbols) {
    const signals = [];
    
    for (const symbol of symbols) {
      try {
        const signal = await this.generateRSISignal(symbol);
        signals.push(signal);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        logger.error(`Error processing ${symbol}:`, error.message);
        signals.push({
          symbol: symbol,
          signal: 'HOLD',
          confidence: 0,
          reason: `Error: ${error.message}`,
          timestamp: new Date(),
          shouldExecute: false
        });
      }
    }

    return signals;
  }

  /**
   * Get recommended position size based on confidence
   * @param {number} confidence - Signal confidence (0-1)
   * @param {number} maxPosition - Maximum position size
   * @returns {number} Recommended position size
   */
  getPositionSize(confidence, maxPosition = 10) {
    // Scale position size based on confidence
    // Higher confidence = larger position
    const baseSize = Math.floor(confidence * maxPosition);
    return Math.max(1, baseSize); // Minimum 1 share
  }
}

module.exports = new SignalGenerator();
