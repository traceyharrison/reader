# 📚 Modern PDF Reader

A sleek, mobile-friendly PDF reader with page-turning animations and a dark, modern design.

## ✨ Features

### 📱 Mobile-First Design
- **Responsive Layout**: Optimized for all screen sizes
- **Touch Gestures**: Swipe left/right to navigate pages
- **Pinch to Zoom**: Natural zoom controls on mobile devices
- **Touch-Friendly Controls**: Large buttons optimized for mobile interaction

### 🎭 Page-Turning Animations
- **Smooth Transitions**: Beautiful 3D flip animations when changing pages
- **Direction-Aware**: Different animations for forward and backward navigation
- **Performance Optimized**: Smooth animations even on mobile devices

### 🌙 Dark & Modern UI
- **Dark Theme**: Easy on the eyes with modern dark color scheme
- **Gradient Accents**: Beautiful purple gradients for interactive elements
- **Glassmorphism**: Subtle blur effects and transparency
- **Clean Typography**: Segoe UI font stack for optimal readability

### 🎮 Navigation & Controls
- **Multiple Navigation Options**:
  - Touch gestures (swipe left/right)
  - Keyboard shortcuts (arrow keys, space, +/-)
  - Button controls
  - Page number input
  - Table of contents (when available)

### 🔍 Zoom & Viewing Options
- **Flexible Zoom**: Manual zoom (50% - 500%)
- **Smart Fitting**: Fit to width or fit to page
- **Pinch to Zoom**: Natural mobile zoom gestures
- **High-Quality Rendering**: Sharp text and graphics at all zoom levels

## 🚀 Getting Started

### Quick Start
1. Open `index.html` in a modern web browser
2. Click "Open PDF" or drag and drop a PDF file
3. Use swipe gestures on mobile or arrow keys on desktop to navigate

### File Structure
```
PDF Reader/
├── index.html          # Main application file
├── css/
│   └── styles.css      # Modern dark theme styling
├── js/
│   └── app.js          # Application logic and PDF handling
├── assets/
│   └── icons/          # App icons and images
├── pdfs/               # Store your PDF files here
└── README.md           # This file
```

## 📋 Usage Instructions

### Desktop Controls
- **Arrow Keys**: Navigate pages (←/→ or ↑/↓)
- **Space**: Next page
- **Home/End**: Jump to first/last page
- **+/-**: Zoom in/out
- **Mouse Wheel**: Scroll through document

### Mobile Controls
- **Swipe Left**: Next page
- **Swipe Right**: Previous page
- **Pinch**: Zoom in/out
- **Tap**: Select controls
- **Double Tap**: Fit to width

### Features Overview

#### 📄 Page Navigation
- Navigate using buttons, keyboard, or gestures
- Jump to specific pages using the page input
- Visual feedback with page-turning animations

#### 🔍 Zoom Controls
- **Zoom In/Out**: Fine-grained zoom control
- **Fit to Width**: Automatically fit page width to screen
- **Fit to Page**: Show entire page on screen
- **Manual Zoom**: Type specific zoom percentage

#### 📋 Table of Contents
- Automatically loads PDF bookmarks/outline
- Click any item to jump to that section
- Hierarchical display for nested bookmarks

#### 💾 Additional Features
- **Download**: Save the loaded PDF file
- **Print**: Print the current document
- **Fullscreen**: Immersive reading experience
- **Drag & Drop**: Drop PDF files anywhere on the page

## 🛠️ Technical Details

### Dependencies
- **PDF.js**: Mozilla's PDF rendering library (loaded from CDN)
- **Modern Browser**: Supports HTML5 Canvas and ES6+ features

### Browser Support
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

### Performance Features
- **Lazy Loading**: Pages rendered on demand
- **Memory Management**: Efficient canvas reuse
- **Touch Optimization**: Responsive touch handling
- **Animation Optimization**: Hardware-accelerated CSS animations

## 🎨 Customization

### Color Scheme
The app uses CSS custom properties for easy theming. Edit `css/styles.css`:

```css
:root {
    --primary-bg: #0f0f0f;        /* Main background */
    --secondary-bg: #1a1a1a;      /* Panel backgrounds */
    --accent-color: #4f46e5;      /* Interactive elements */
    --text-primary: #ffffff;      /* Primary text */
    --text-secondary: #b3b3b3;    /* Secondary text */
}
```

### Adding New Features
The modular design makes it easy to extend:
- Add new zoom levels in `app.js`
- Customize animations in `styles.css`
- Add new keyboard shortcuts in `setupKeyboardNavigation()`

## 🔧 Development

### Local Development
1. Clone or download the files
2. Serve using a local HTTP server (required for PDF.js):
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js
   npx http-server
   
   # Live Server (VS Code extension)
   ```
3. Open http://localhost:8000 in your browser

### Progressive Web App (PWA)
The app is PWA-ready. To enable full PWA features:
1. Create `manifest.json` with app metadata
2. Add service worker (`sw.js`) for offline functionality
3. Add app icons in various sizes

## 🐛 Troubleshooting

### Common Issues

**PDF not loading**:
- Ensure the file is a valid PDF
- Check browser console for error messages
- Try a different PDF file

**Animations choppy on mobile**:
- Reduce motion in device accessibility settings
- Close other browser tabs to free up memory
- Try a different browser

**Touch gestures not working**:
- Ensure JavaScript is enabled
- Check if the browser supports touch events
- Try refreshing the page

## 📝 License

This project is open source and available under the MIT License.

## 🤝 Contributing

Feel free to submit issues, feature requests, or pull requests to improve the app!

---

**Enjoy reading your PDFs with style! 📖✨**