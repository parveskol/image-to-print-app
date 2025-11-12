<div align="center">

# 📸 Image to Print Pro

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg?cacheSeconds=2592000)](https://github.com/your-username/image-to-print/releases)
[![Documentation](https://img.shields.io/badge/documentation-yes-green.svg?cacheSeconds=2592000)](README.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

[![Build Status](https://github.com/your-username/image-to-print/workflows/Build%20and%20Test/badge.svg)](https://github.com/your-username/image-to-print/actions)
[![CodeQL](https://github.com/your-username/image-to-print/workflows/CodeQL/badge.svg)](https://github.com/your-username/image-to-print/security/code-scanning)
[![codecov](https://codecov.io/gh/your-username/image-to-print/branch/main/graph/badge.svg)](https://codecov.io/gh/your-username/image-to-print)

[![Bundle Size](https://img.shields.io/bundlephobia/minzip/image-to-print)](https://bundlephobia.com/package/image-to-print)
[![Node Version](https://img.shields.io/node/v/image-to-print)](https://nodejs.org/en/)
[![npm downloads](https://img.shields.io/npm/dm/image-to-print.svg)](https://npmjs.org/package/image-to-print)

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)](https://image-to-print.vercel.app)
[![React](https://img.shields.io/badge/React-19.2.0-blue?logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.14-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

A powerful Progressive Web App (PWA) for formatting images for printing. Crop to passport sizes, add borders, arrange on A4 sheets with ease - now with a beautiful soft minimalistic UI!

[Live Demo](https://image-to-print.vercel.app) • [Documentation](https://github.com/your-username/image-to-print/wiki) • [Report Bug](https://github.com/your-username/image-to-print/issues) • [Request Feature](https://github.com/your-username/image-to-print/issues)

</div>

---

## ✨ Features

### Core Functionality
- 🖼️ **Image Upload** - Drag & drop, click to browse, or use your camera
- ✂️ **Smart Cropping** - Crop to standard passport sizes or custom dimensions
- 📄 **Print Layout** - Automatically arrange multiple photos on A4 sheets
- 🎨 **Background Removal** - Built-in tool to remove backgrounds
- 🖨️ **Export Options** - Download as PDF or high-quality images
- 💾 **Offline Support** - Works without internet connection

### New UI Features
- 🌓 **Dark/Light Theme** - Beautiful themes with smooth transitions
- ✨ **Smooth Animations** - 60fps GPU-accelerated animations
- 💎 **Glass Morphism** - Modern frosted glass effects
- 📱 **Mobile Optimized** - Touch gestures and responsive design
- ♿ **Accessible** - WCAG AA compliant with keyboard navigation
- 🎯 **Minimalistic Design** - Clean, uncluttered interface

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have installed:
- **Node.js** (version 18 or higher) - [Download](https://nodejs.org/)
- **npm** (version 8 or higher) - Comes with Node.js

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/image-to-print.git
cd image-to-print

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Environment Variables

Copy the environment file and configure your variables:

```bash
cp .env.example .env.local
```

Required environment variables:
```env
# API Configuration
VITE_API_BASE_URL=https://your-api-domain.com

# Debug Settings
VITE_DEBUG_MODE=false
VITE_ENABLE_LOGGING=false

# PWA Settings
VITE_PWA_ENABLED=true
VITE_PWA_UPDATE_CHECK_INTERVAL=3600000

# Performance Monitoring
VITE_PERFORMANCE_MONITORING=true
VITE_ANALYTICS_ENABLED=true
```

## 🎨 Theme System

### Toggle Theme
Click the **sun/moon icon** in the top-right corner to switch between light and dark modes.

### Customization
Edit `styles.css` to customize colors:

```css
:root {
  --accent-primary: #3b82f6;  /* Your primary color */
  --accent-secondary: #8b5cf6; /* Your secondary color */
}
```

## 📱 Progressive Web App

This app can be installed on your device:
- **Desktop**: Click the install icon in your browser's address bar
- **Mobile**: Tap "Add to Home Screen" from your browser menu
- **Offline**: Works without internet after installation

## 🛠️ Technology Stack

[![React](https://img.shields.io/badge/React-19.2.0-61DAFB?style=flat&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2.0-646CFF?style=flat&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.14-38B2AC?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=flat)](https://web.dev/progressive-web-apps/)

## 📂 Project Structure

```
image-to-print/
├── .github/                 # GitHub templates and workflows
│   ├── ISSUE_TEMPLATE/      # Bug reports and feature requests
│   └── workflows/           # CI/CD workflows
├── components/              # React components
│   ├── ImageUploader.tsx    # Image upload component
│   ├── ImageCropper.tsx     # Image cropping component
│   ├── PrintLayout.tsx      # A4 layout component
│   └── icons.tsx           # Icon components
├── utils/                   # Utility functions
│   ├── backgroundRemoval.ts # Background removal algorithm
│   ├── imageResizer.ts     # Image processing utilities
│   └── performanceMonitor.ts # Performance monitoring
├── public/                  # Static assets
│   ├── icons/              # PWA icons
│   └── manifest.webmanifest # PWA manifest
├── styles.css               # Theme system (1000+ lines)
├── index.css                # Tailwind integration
├── App.tsx                  # Main app component
├── constants.ts             # App constants
├── vite.config.ts           # Vite configuration
└── package.json             # Project metadata
```

## 🎯 Key Features Explained

### Background Removal
- Built-in canvas-based background removal
- Flood fill algorithm for edge detection
- Replaces background with white
- No external API required

### Print Layout
- Automatic arrangement on A4 sheets (210mm × 297mm)
- Smart spacing between photos
- Optimized for printing at 300 DPI
- Export as PDF or PNG

### Image Cropping
- Standard passport sizes (35×45mm, 40×50mm, etc.)
- Custom size support
- Aspect ratio locking
- Live preview with borders

## ⚙️ Configuration

### Passport Sizes
Edit `constants.ts` to add custom sizes:

```typescript
export const PASSPORT_SIZES: PassportSize[] = [
  { name: "35×45 mm", width_mm: 35, height_mm: 45 },
  // Add your custom sizes here
];
```

### DPI Settings
Default DPI is 300. Adjust in `constants.ts`:

```typescript
export const DPI = 300; // Change to your preferred DPI
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Testing Guidelines
- Unit tests for utility functions
- Integration tests for components
- E2E tests for critical user flows
- Cross-browser compatibility testing

## 🐛 Troubleshooting

### Common Issues

#### Scrolling Issues
If you experience scrolling problems, try:
- Refresh the page
- Clear browser cache
- Update to the latest version

#### Background Removal Not Working
- Ensure the image is loaded properly
- Check browser console for errors
- Try with a smaller image size
- Make sure canvas API is supported

#### App Crashes on Multiple Edits
- The app now has improved memory management
- Canvas elements are properly cleaned up
- Debounced preview updates reduce crashes

## 📚 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Detailed deployment instructions
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines
- **[CHANGELOG.md](CHANGELOG.md)** - Version history
- **Inline comments** - Detailed code documentation

## 🔧 Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript compiler check |
| `npm test` | Run test suite |
| `npm run deploy:vercel` | Deploy to Vercel |

### Code Quality
```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check
```

## 🌐 Browser Support

| Browser | Version | Status |
|---------|---------|--------|
| Chrome/Edge | 90+ | ✅ Fully Supported |
| Firefox | 88+ | ✅ Fully Supported |
| Safari | 14+ | ✅ Fully Supported |
| iOS Safari | 14+ | ✅ Fully Supported |
| Android Chrome | 90+ | ✅ Fully Supported |

## 📝 Recent Updates

### Version 2.0.0 (Latest)
- ✨ Complete UI redesign with soft minimalistic theme
- 🌓 Enhanced dark/light mode with smooth transitions
- 🎨 Glass morphism effects and gradient accents
- 🔧 Fixed scrolling issues
- 🛡️ Improved memory management (no more crashes)
- 🎯 Better background removal algorithm
- 📱 Enhanced mobile experience
- ♿ Improved accessibility (WCAG AA)

### Version 1.0.0
- 🎉 Initial release
- 📸 Basic image upload and cropping
- 🖨️ A4 print layout functionality
- 🔄 Background removal feature

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to get started.

### Ways to Contribute
- 🐛 **Report bugs** by opening an issue
- 💡 **Suggest features** through feature requests
- 🔧 **Contribute code** via pull requests
- 📖 **Improve documentation**
- 🌍 **Translate the app**
- 🎨 **Improve UI/UX design**

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 💡 Tips

- **Better Results**: Use well-lit photos with clear backgrounds
- **Batch Processing**: Upload multiple images at once
- **Theme Preference**: Your theme choice is automatically saved
- **Keyboard Navigation**: Use Tab to navigate, Enter to activate
- **Mobile Gestures**: Swipe between steps on mobile devices

## 🆘 Support

For issues or questions:

1. 📖 Check the [documentation](README.md)
2. 🔍 Review the [troubleshooting section](#-troubleshooting)
3. 🐛 Search [existing issues](https://github.com/your-username/image-to-print/issues)
4. 🆕 [Create a new issue](https://github.com/your-username/image-to-print/issues/new/choose)
5. 💬 Join our [discussions](https://github.com/your-username/image-to-print/discussions)

## 🏗️ Deployment

### Vercel (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyour-username%2Fimage-to-print)

Detailed deployment instructions can be found in [DEPLOYMENT.md](DEPLOYMENT.md).

### Other Platforms
- **Netlify**: `npm run build` → `dist/` folder
- **GitHub Pages**: Configure in repository settings
- **Firebase Hosting**: Use Firebase CLI

---

<div align="center">

**Built with ❤️ for photographers, designers, and anyone who needs perfect prints.**

[⬆️ Back to Top](#-image-to-print-pro)

</div>