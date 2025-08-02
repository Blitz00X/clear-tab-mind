#!/bin/bash

# Build script for Clear Tab Mind Chrome Extension

echo "Building Clear Tab Mind Chrome Extension..."

# Create build directory
BUILD_DIR="clear-tab-mind-extension"
mkdir -p $BUILD_DIR

# Copy extension files
echo "Copying extension files..."
cp manifest.json $BUILD_DIR/
cp popup.html $BUILD_DIR/
cp popup.js $BUILD_DIR/
cp popup.css $BUILD_DIR/
cp background.js $BUILD_DIR/
cp content.js $BUILD_DIR/

# Copy icons
mkdir -p $BUILD_DIR/icons
cp icons/*.png $BUILD_DIR/icons/

# Copy README
cp CHROME_EXTENSION_README.md $BUILD_DIR/README.md

# Create ZIP file
echo "Creating ZIP file..."
cd $BUILD_DIR
zip -r ../clear-tab-mind-extension.zip .
cd ..

echo "Extension built successfully!"
echo "Files are in: $BUILD_DIR/"
echo "ZIP file: clear-tab-mind-extension.zip"
echo ""
echo "To install in Chrome:"
echo "1. Open chrome://extensions/"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked' and select the $BUILD_DIR folder" 