import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';
  
  return {
    plugins: [
      react({
        // React plugin configuration
      })
    ],
    build: {
      // Enhanced minification settings
      minify: isProduction ? "terser" : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : [],
        },
        mangle: {
          safari10: true,
        },
        format: {
          comments: false,
        },
      } : undefined,
      
      // Advanced chunking strategy
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Separate vendor chunks
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              if (id.includes('react-image-crop')) {
                return 'image-processing';
              }
              if (id.includes('@tailwindcss') || id.includes('tailwindcss')) {
                return 'tailwind-vendor';
              }
              return 'vendor';
            }
            
            // Group utility chunks
            if (id.includes('/utils/')) {
              return 'utils';
            }
            
            // Group component chunks
            if (id.includes('/components/')) {
              return 'components';
            }
            
            return undefined;
          },
          
          // Enhanced asset naming with better cache busting
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name.split('.');
            const ext = info[info.length - 1];
            
            if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
              return `images/[name]-[hash][extname]`;
            }
            if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name)) {
              return `fonts/[name]-[hash][extname]`;
            }
            
            return `assets/[name]-[hash][extname]`;
          },
          
          // Better chunk file naming
          chunkFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'react-vendor') {
              return 'assets/[name]-[hash].js';
            }
            if (chunkInfo.name === 'vendor' || chunkInfo.name === 'image-processing') {
              return 'vendor/[name]-[hash].js';
            }
            return 'assets/[name]-[hash].js';
          },
          
          entryFileNames: 'assets/[name]-[hash].js',
        },
        
        // Tree shaking configuration
        treeshake: {
          moduleSideEffects: false,
          propertyReadSideEffects: false,
          tryCatchDeoptimization: false,
        },
      },
      
      // Enhanced build optimization
      assetsInlineLimit: isProduction ? 4096 : 0,
      sourcemap: !isProduction,
      manifest: isProduction,
      cssCodeSplit: true,
      
      // Modern browser targeting for better optimization
      target: isProduction ? 'es2020' : 'es2015',
      
      // Compression and chunk size optimization
      chunkSizeWarningLimit: isProduction ? 500 : 1000,
      
      // Enable experimental features for better optimization
      reportCompressedSize: isProduction,
      // Remove unused assets
      outDir: 'dist',
      emptyOutDir: true,
    },
    
    // Development server configuration
    server: {
      hmr: !isProduction,
      port: 3000,
      host: true,
    },
    
    // Environment-specific configuration
    define: {
      // Global defines for environment detection
      "process.env.NODE_ENV": JSON.stringify(mode),
      "process.env.BUILD_TIME": JSON.stringify(new Date().toISOString()),
      "process.env.BUILD_VERSION": JSON.stringify(process.env.npm_package_version || '0.0.0'),
    },
    
    // Enhanced esbuild configuration
    esbuild: {
      logOverride: { "this-is-undefined-in-esm": "silent" },
      // Enhanced tree shaking
      treeShaking: true,
      // Better error handling
      drop: isProduction ? ['console', 'debugger'] : [],
    },
    
    // Production preview server configuration
    preview: {
      port: 4173,
      host: true,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
      },
    },
    
    // Dependency optimization
    optimizeDeps: {
      include: isProduction ? [
        'react',
        'react-dom',
        'react-image-crop'
      ] : [],
      
      exclude: isProduction ? [] : [
        // Only exclude in development
      ],
      
      // Pre-bundle configuration
      esbuildOptions: {
        target: isProduction ? 'es2020' : 'es2015',
      },
    },
    
    // Worker configuration
    worker: {
      format: 'es',
    },
    
    // CSS configuration
    css: {
      devSourcemap: !isProduction,
      postcss: './postcss.config.js',
    },
  };
});
