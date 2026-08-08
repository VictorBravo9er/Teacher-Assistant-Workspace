import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
// import javascriptObfuscator from "vite-plugin-javascript-obfuscator";
// import { obfuscator } from "rollup-obfuscator";
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [
    {
      name: "ignore-dev-tools-dir-read",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (
            req.url &&
            (req.url === "/app" ||
              req.url.startsWith("/app?") ||
              req.url === "/app/")
          ) {
            res.statusCode = 204;
            res.end();
            return;
          }
          next();
        });
      },
    },
    react(),
    tailwindcss(),
    // javascriptObfuscator({
    //   apply: "build",
    //   options: {
    //     compact: true,
    //     controlFlowFlattening: true,
    //     deadCodeInjection: false,
    //     stringArray: true,
    //     stringArrayEncoding: ["base64"],
    //     stringArrayThreshold: 0.8,
    //     renameGlobals: false,
    //     simplify: true,
    //     selfDefending: true,
    //   },
    // }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: `http://${process.env.BACKEND_HOST || "localhost"}:${process.env.BACKEND_PORT || 8090}`,
        changeOrigin: true,
      },
    },
    hmr: process.env.DISABLE_HMR !== "true",
    watch: process.env.DISABLE_HMR === "true" ? null : {},
  },
  build: {
    // Switch to terser for JS minification (slower but more configurable)
    minify: "terser",
    terserOptions: {
      compress: {
        // Keep it "not too aggressive": leave these as false for now if you want to retain logs
        passes: 3,
        drop_console: true,
        drop_debugger: true,
      },
      mangle: {
        toplevel: true,
      },
      format: {
        comments: false,
      },
    },
    // Use LightningCSS for fast and standards-compliant CSS minification
    cssMinify: "lightningcss",
    // Lower threshold for inlining assets into JS/CSS as base64 (default is 4096)
    // 2048 means only files under 2KB are inlined; the rest are emitted as separate files for better caching.
    assetsInlineLimit: 2048,
    // Disable sourcemaps to save build time and hide source code in production
    sourcemap: false,
    rollupOptions: {
      output: {
        // Vendor splitting: split heavy dependencies into their own chunks
        manualChunks(id) {
          if (id.includes("node_modules")) {
            // Group React and related packages together
            if (id.includes("react") || id.includes("react-dom")) {
              return "react-vendor";
            }
            // Separate heavy icon libraries
            if (id.includes("lucide-react")) {
              return "ui-icons";
            }
            // Separate Supabase SDK as it can be large and updates independently
            if (id.includes("@supabase")) {
              return "supabase-vendor";
            }
            // Catch-all for remaining dependencies
            return "vendor";
          }
        },
      },
      plugins: [
        // obfuscator({
        //   include: ["assets/index-*.js"],
        //   options: {
        //     compact: true,
        //     controlFlowFlattening: true,
        //     controlFlowFlatteningThreshold: 0.3,
        //     stringArray: true,
        //     stringArrayEncoding: ["base64"],
        //     stringArrayThreshold: 0.8,
        //     identifierNamesGenerator: "hexadecimal",
        //     renameGlobals: false,
        //     selfDefending: true,
        //     deadCodeInjection: false,
        //   },
        // }),
      ],
    },
  },
});
