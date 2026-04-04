#!/bin/bash

# LinkedIn Hyper-V v2 - Startup Script
# Usage: ./start.sh [dev|prod]

set -e

MODE=${1:-prod}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 LinkedIn Hyper-V v2 - Starting in $MODE mode..."

# Check if .env file exists
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "⚠️  .env file not found!"
    echo "Please copy .env.example to .env and configure your settings:"
    echo "  cp .env.example .env"
    exit 1
fi

# Create necessary directories
mkdir -p logs

if [ "$MODE" = "dev" ]; then
    echo "🧪 Running in development mode..."
    
    # Start infrastructure only
    docker-compose up -d postgres redis
    
    echo "⏳ Waiting for services to be ready..."
    sleep 5
    
    # Install dependencies
    echo "📦 Installing dependencies..."
    cd "$SCRIPT_DIR/worker" && npm install
    cd "$SCRIPT_DIR" && npm install
    
    # Generate Prisma client
    echo "🔧 Generating Prisma client..."
    cd "$SCRIPT_DIR/worker" && npx prisma generate
    
    # Run migrations
    echo "🗄️  Running database migrations..."
    cd "$SCRIPT_DIR/worker" && npx prisma migrate dev --name init
    
    echo ""
    echo "✅ Development environment ready!"
    echo ""
    echo "Start the services:"
    echo "  Terminal 1 - Worker:  cd worker && npm run dev"
    echo "  Terminal 2 - Frontend: npm run dev"
    echo ""
    echo "Prisma Studio: cd worker && npx prisma studio"
    
else
    echo "🚀 Running in production mode..."
    
    # Build and start all services
    docker-compose up -d --build
    
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    # Run migrations
    echo "🗄️  Running database migrations..."
    cd "$SCRIPT_DIR/worker" && npx prisma migrate deploy
    
    echo ""
    echo "✅ Production environment started!"
    echo ""
    echo "Dashboard: http://localhost:3000"
    echo "Worker API: http://localhost:3001"
    echo "noVNC: http://localhost:8080"
    echo ""
    echo "View logs: docker-compose logs -f"
    echo "Stop: docker-compose down"
fi
