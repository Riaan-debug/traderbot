#!/bin/bash

echo "🚀 Trading Automation App - Quick Start"
echo "========================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your Alpaca API keys before continuing."
    echo "   You can get them from: https://app.alpaca.markets/paper/dashboard/overview"
    echo ""
    read -p "Press Enter after updating .env file..."
fi

# Check if .env has been configured
if grep -q "your_alpaca_api_key_here" .env; then
    echo "❌ Please update .env file with your actual Alpaca API keys."
    exit 1
fi

echo "🔧 Building and starting services..."
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🏥 Checking service health..."

# Backend health check
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend: Healthy"
else
    echo "❌ Backend: Unhealthy"
fi

# Frontend health check
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend: Healthy"
else
    echo "❌ Frontend: Unhealthy"
fi

# n8n health check
if curl -f http://localhost:5678 > /dev/null 2>&1; then
    echo "✅ n8n: Healthy"
else
    echo "❌ n8n: Unhealthy"
fi

echo ""
echo "🎉 Setup complete! Your trading automation app is ready."
echo ""
echo "🌐 Access Points:"
echo "   Frontend Dashboard: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo "   n8n Automation: http://localhost:5678"
echo ""
echo "📚 Next Steps:"
echo "   1. Visit the frontend dashboard to view your portfolio"
echo "   2. Place your first trade using the Trade page"
echo "   3. Set up automated workflows in n8n"
echo "   4. Import the monthly DCA workflow from n8n_workflows/"
echo ""
echo "📖 For more information, see README.md"
echo ""
echo "🛑 To stop services: docker-compose down"
echo "📊 To view logs: docker-compose logs -f"

