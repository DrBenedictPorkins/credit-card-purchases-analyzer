#!/bin/bash

# Credit Card Purchases Analyzer - Build Script
# For ByteClub (com.byteclub)

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}Credit Card Purchases Analyzer Build${NC}"
echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}Company: ByteClub (com.byteclub)${NC}"
echo -e "${BLUE}====================================${NC}"
echo ""

# Check for required tools
echo -e "${YELLOW}Checking required dependencies...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Please install Node.js first.${NC}"
    exit 1
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}Node.js is installed: $NODE_VERSION${NC}"
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}NPM is not installed. Please install NPM first.${NC}"
    exit 1
else
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}NPM is installed: $NPM_VERSION${NC}"
fi

# Install dependencies if they don't exist
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install dependencies.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Dependencies installed successfully.${NC}"
else
    echo -e "${GREEN}Dependencies already installed.${NC}"
fi

# Check if electron-builder is installed
if ! npm list -g electron-builder &> /dev/null && ! npm list electron-builder &> /dev/null; then
    echo -e "${YELLOW}Installing electron-builder...${NC}"
    npm install --save-dev electron-builder
    if [ $? -ne 0 ]; then
        echo -e "${RED}Failed to install electron-builder.${NC}"
        exit 1
    fi
    echo -e "${GREEN}electron-builder installed successfully.${NC}"
else
    echo -e "${GREEN}electron-builder is already installed.${NC}"
fi

# Make the build directory if it doesn't exist
if [ ! -d "build" ]; then
    echo -e "${YELLOW}Creating build directory...${NC}"
    mkdir -p build
fi

# Check for app icon, create a placeholder if it doesn't exist
if [ ! -f "build/icon.icns" ] && [ ! -f "build/icon.png" ]; then
    echo -e "${YELLOW}No icon found. Creating a placeholder icon...${NC}"
    echo -e "${YELLOW}NOTE: For production, replace build/icon.png with your app icon (1024x1024px)${NC}"
    
    # Create a simple placeholder icon if ImageMagick is available
    if command -v convert &> /dev/null; then
        convert -size 1024x1024 xc:none -fill blue -draw "rectangle 0,0 1024,1024" -fill white -draw "circle 512,512 300,300" build/icon.png
        echo -e "${GREEN}Created placeholder icon at build/icon.png${NC}"
    else
        echo -e "${YELLOW}ImageMagick not found. Please manually add an icon at build/icon.png or build/icon.icns${NC}"
        touch build/icon.png
    fi
else
    echo -e "${GREEN}App icon found.${NC}"
fi

# Build the application
echo -e "${YELLOW}Building the application...${NC}"
echo -e "${YELLOW}This may take a few minutes...${NC}"

# Create macOS app
npm run dist:mac

if [ $? -ne 0 ]; then
    echo -e "${RED}Build failed.${NC}"
    exit 1
fi

echo -e "${GREEN}Build completed successfully!${NC}"
echo -e "${GREEN}Your application is available in the dist directory.${NC}"
echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}Installation Instructions:${NC}"
echo -e "${BLUE}1. Open the dist folder${NC}"
echo -e "${BLUE}2. Open the .dmg file${NC}"
echo -e "${BLUE}3. Drag the app to your Applications folder${NC}"
echo -e "${BLUE}====================================${NC}"

echo -e "${YELLOW}Would you like to open the dist folder now? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    open dist
fi

exit 0