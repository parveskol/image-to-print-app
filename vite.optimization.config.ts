import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Disable code minification with eval for better CSP compatibility in production
    minify: "esbuild",
    rollupOptions: {
      output: {
        // Optimize chunk splitting for better loading performance
        manualChunks: {
          // Separate vendor libraries
          vendor: ["react", "react-dom"],
          // Separate UI libraries
          ui: ["@headlessui/react", "@heroicons/react"],
          // Separate utility libraries
          utils: ["lodash", "date-fns"],
          // Separate image processing (heavy)
          imageProcessing: [
            "react-image-crop",
            "./utils/optimizedImageProcessor.ts",
            "./utils/reliableBackgroundRemoval.ts"
          ]
        },
        // Ensure proper cache busting for assets
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
    // Enable cache busting with content hashes
    assetsInlineLimit: 4096,
    sourcemap: false,
    // Add proper cache control headers
    manifest: true,
    cssCodeSplit: true,
    
    // Mobile-specific optimizations
    target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
    
    // Optimize for mobile networks
    chunkSizeWarningLimit: 500, // Lower warning limit for mobile
  },
  server: {
    // Allow eval in development for HMR
    hmr: true,
  },
  define: {
    // Global defines to help with CSP
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "development",
    ),
  },
  // Ensure proper content hashing
  esbuild: {
    logOverride: { "this-is-undefined-in-esm": "silent" },
    // Optimize for mobile performance
    target: 'es2020',
    // Enable tree shaking
    treeShaking: true,
  },
  // Add cache control headers
  preview: {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  },
  
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-image-crop'
    ],
    exclude: [
      // Exclude heavy image processing modules from pre-bundling
      './utils/optimizedImageProcessor.ts',
      './utils/reliableBackgroundRemoval.ts'
    ]
  },
  
  // Conditional loading based on device capabilities
  resolve: {
    conditions: ['mobile', 'modern', 'import', 'module', 'jsnext:main', 'default']
  }
});