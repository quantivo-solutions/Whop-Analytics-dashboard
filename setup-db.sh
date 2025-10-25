#!/bin/bash

echo "🚀 Setting up Analytics Dashboard Database..."

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from env.example..."
    cp env.example .env.local
    echo "⚠️  Please update the DATABASE_URL in .env.local with your PostgreSQL connection string"
    echo "   Example: DATABASE_URL=\"postgresql://username:password@localhost:5432/analytics_dashboard?schema=public\""
    echo ""
    read -p "Press Enter when you've updated the DATABASE_URL..."
fi

echo "🔧 Generating Prisma client..."
yarn db:generate

echo "📊 Pushing schema to database..."
yarn db:push

echo "🌱 Seeding database with 30 days of fake data..."
yarn db:seed

echo "✅ Database setup complete!"
echo "🎉 You can now run 'yarn dev' to start the development server"
echo "🔍 Run 'yarn db:studio' to open Prisma Studio and view your data"
