# 🚀 TradingBot - Automated Trading System

A complete automated trading system built with Node.js, React, and n8n for automated paper trading via Alpaca Markets API.

## ✨ Features

- **📊 Real-time Trading**: Paper trading via Alpaca Markets API
- **🤖 Automation**: n8n workflows for scheduled investments
- **📱 Modern UI**: React dashboard with Tailwind CSS
- **🐳 Dockerized**: Complete containerized setup
- **🔒 Secure**: Environment-based configuration and CORS protection

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Node.js Backend │    │   n8n Workflows │
│   (Port 3002)   │◄──►│   (Port 5001)   │◄──►│   (Port 5678)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Alpaca Markets  │
                    │   Paper API     │
                    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Docker Desktop
- Alpaca Markets API keys (paper trading)

### 1. Clone and Setup

```bash
git clone https://github.com/Riaan-debug/traderbot.git
cd traderbot
```

### 2. Configure Environment

Copy the example environment file and add your Alpaca API keys:

```bash
cp .env.example .env
```

Edit `.env` with your Alpaca credentials:
```env
ALPACA_API_KEY=your_api_key_here
ALPACA_SECRET_KEY=your_secret_key_here
ALPACA_BASE_URL=https://paper-api.alpaca.markets
PORT=5001
NODE_ENV=development
```

### 3. Start the Application

```bash
docker compose up -d
```

### 4. Access the Services

- **Frontend Dashboard**: http://localhost:3002
- **Backend API**: http://localhost:5001
- **n8n Workflows**: http://localhost:5678

## 📊 API Endpoints

### Trading API

- `GET /api/trading/portfolio` - Get portfolio information
- `GET /api/trading/history` - Get trade history
- `POST /api/trading/trade` - Place a trade

### Example Trade Request

```json
{
  "symbol": "SPY",
  "qty": 10,
  "side": "buy",
  "type": "market"
}
```

## 🤖 n8n Automation

### Monthly Investment Workflow

The system includes a pre-configured n8n workflow that:
- Runs on the 1st of every month at midnight
- Automatically buys 10 shares of SPY
- Uses paper trading (no real money at risk)

### Creating Custom Workflows

1. Access n8n at http://localhost:5678
2. Create new workflow
3. Use "Schedule Trigger" for time-based automation
4. Add "HTTP Request" nodes to call your backend API
5. Configure notifications (email, Slack, etc.)

## 🛠️ Development

### Backend Development

```bash
cd backend
npm install
npm run dev
```

### Frontend Development

```bash
cd frontend
npm install
npm start
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ALPACA_API_KEY` | Alpaca API key | Required |
| `ALPACA_SECRET_KEY` | Alpaca secret key | Required |
| `ALPACA_BASE_URL` | Alpaca API base URL | `https://paper-api.alpaca.markets` |
| `PORT` | Backend port | `5001` |
| `NODE_ENV` | Environment | `development` |

### Docker Services

- **backend**: Node.js API server
- **frontend**: React application with Nginx
- **n8n**: Workflow automation platform

## 📈 Trading Features

- **Paper Trading**: Safe testing with virtual money
- **Market Orders**: Immediate execution at current price
- **Portfolio Tracking**: Real-time account and position data
- **Trade History**: Complete transaction log
- **Automated Investing**: Scheduled monthly investments

## 🔒 Security

- Environment-based API key management
- CORS protection
- Input validation
- Rate limiting
- Secure Docker containers

## 📝 License

This project is for educational purposes. Please ensure compliance with Alpaca Markets terms of service and local regulations.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## ⚠️ Disclaimer

This software is for educational and testing purposes only. Paper trading does not involve real money, but always verify your setup before using with live trading accounts. Trading involves risk, and past performance does not guarantee future results.

## 🆘 Support

For issues and questions:
1. Check the logs: `docker compose logs [service]`
2. Verify API keys in `.env`
3. Ensure all services are running: `docker compose ps`
4. Check n8n workflow status at http://localhost:5678

---

**Happy Trading! 📈🚀**