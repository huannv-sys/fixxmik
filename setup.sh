#!/bin/bash

# Clone and setup fixxmik repository
echo "Cloning fixxmik repository..."

if [ -d "fixxmik" ]; then
  echo "Repository directory already exists. Updating..."
  cd fixxmik
  git pull
else 
  echo "Cloning the repository..."
  git clone https://github.com/huannv-sys/fixxmik.git
  cd fixxmik
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Fix missing date-fns package
npm install date-fns

# Initialize database
echo "Initializing database..."
npx drizzle-kit push

# Start the server
echo "Starting the server..."
npm run dev