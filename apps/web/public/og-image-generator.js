/**
 * OG Image Generator
 * 
 * This script generates a 1200x630px OG image for Planningo.
 * Install dependencies: npm install canvas
 * Run: node og-image-generator.js
 * 
 * Outputs: public/og-image.png
 */

const fs = require('fs');
const path = require('path');

// Check if canvas is available
let Canvas;
try {
  Canvas = require('canvas');
} catch (e) {
  console.log('❌ canvas library not installed.');
  console.log('Install with: npm install canvas');
  console.log('\nFor Windows:');
  console.log('  npm install --build-from-source canvas');
  console.log('\nFor macOS/Linux:');
  console.log('  brew install cairo');
  console.log('  npm install canvas');
  process.exit(1);
}

const { createCanvas } = Canvas;

// Create canvas 1200x630
const canvas = createCanvas(1200, 630);
const ctx = canvas.getContext('2d');

// Background gradient
const gradient = ctx.createLinearGradient(0, 0, 1200, 630);
gradient.addColorStop(0, '#1a1a2e');
gradient.addColorStop(1, '#16213e');
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, 1200, 630);

// Logo circle background
ctx.fillStyle = '#00d4ff';
ctx.beginPath();
ctx.arc(150, 150, 80, 0, Math.PI * 2);
ctx.fill();

// Calendar icon
ctx.fillStyle = '#1a1a2e';
ctx.font = 'bold 60px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('📅', 150, 150);

// Main title
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 72px Arial';
ctx.textAlign = 'left';
ctx.textBaseline = 'top';
ctx.fillText('Planningo', 300, 100);

// Tagline
ctx.fillStyle = '#b0b0b0';
ctx.font = 'regular 32px Arial';
ctx.textAlign = 'left';
ctx.textBaseline = 'top';
ctx.fillText('Your All-in-One Productivity Platform', 300, 200);

// Features section
ctx.fillStyle = '#00d4ff';
ctx.font = 'bold 20px Arial';
const features = ['✓ Todos & Tasks', '✓ Calendar & Events', '✓ Trip Planning', '✓ Expense Splitting'];
let yOffset = 330;
features.forEach((feature, index) => {
  const xOffset = index % 2 === 0 ? 100 : 650;
  const yPos = yOffset + Math.floor(index / 2) * 50;
  ctx.textAlign = 'left';
  ctx.fillText(feature, xOffset, yPos);
});

// Bottom CTA
ctx.fillStyle = '#ffffff';
ctx.font = 'regular 24px Arial';
ctx.textAlign = 'right';
ctx.textBaseline = 'bottom';
ctx.fillText('www.mydailyworkspace.site', 1150, 600);

// Save image
const buffer = canvas.toBuffer('image/png');
const outputPath = path.join(__dirname, 'og-image.png');
fs.writeFileSync(outputPath, buffer);

console.log('✅ OG image created: public/og-image.png (1200x630px)');
