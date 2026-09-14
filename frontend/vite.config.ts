import fs from 'fs';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
// import javascriptObfuscator from "vite-plugin-javascript-obfuscator";
// import { obfuscator } from "rollup-obfuscator";
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'client-log-broadcaster',
      configureServer(server) {
        const rootLogsDir = path.resolve(__dirname, '../logs');
        if (!fs.existsSync(rootLogsDir)) {
          fs.mkdirSync(rootLogsDir, { recursive: true });
        }

        const formatLogTimestamp = (date = new Date()): string => {
          const pad = (n: number) => String(n).padStart(2, '0');
          const yyyy = date.getFullYear();
          const mm = pad(date.getMonth() + 1);
          const dd = pad(date.getDate());
          const hh = pad(date.getHours());
          const min = pad(date.getMinutes());
          const ss = pad(date.getSeconds());
          return `${yyyy}-${mm}-${dd}-${hh}-${min}-${ss}`;
        };

        const MAX_LOG_ENTRIES = parseInt(process.env.VITE_LOG_MAX_ENTRIES || '5000', 10);
        let currentLogCount = 0;
        let currentSessionTs = formatLogTimestamp();

        const getLogPaths = (ts: string) => ({
          appLog: path.join(rootLogsDir, `frontend-${ts}.log`),
          errorLog: path.join(rootLogsDir, `frontend-error-${ts}.log`),
          jsonlLog: path.join(rootLogsDir, `frontend-${ts}.jsonl`),
        });

        let currentPaths = getLogPaths(currentSessionTs);

        server.ws.on('client:log', (entry: {
          timestamp: string;
          level: string;
          namespace: string;
          message: string;
          data?: unknown;
          durationMs?: number;
        }) => {
          // 1. Coordinated Log Count Rotation: Track primary stream count
          currentLogCount++;
          if (currentLogCount > MAX_LOG_ENTRIES) {
            currentSessionTs = formatLogTimestamp();
            currentPaths = getLogPaths(currentSessionTs);
            currentLogCount = 1;
          }

          // 2. Terminal stdout with ANSI colors
          const levelColor =
            entry.level === 'ERROR' ? '\x1b[31m' :
            entry.level === 'WARN' ? '\x1b[33m' :
            entry.level === 'INFO' ? '\x1b[32m' : '\x1b[90m';
          const reset = '\x1b[0m';
          const durationStr = entry.durationMs ? ` \x1b[35m(${entry.durationMs.toFixed(1)}ms)\x1b[0m` : '';

          console.log(
            `${levelColor}[FRONTEND ${entry.level}]${reset} \x1b[36m[${entry.namespace}]\x1b[0m ${entry.message}${durationStr}`
          );

          // 3. Append Human-Readable Entry to logs/frontend-<timestamp>.log
          const formattedLine = `[${entry.timestamp}] [${entry.level}] [${entry.namespace}] ${entry.message}${
            entry.durationMs ? ` (${entry.durationMs.toFixed(1)}ms)` : ''
          }${entry.data !== undefined ? ` data=${JSON.stringify(entry.data)}` : ''}\n`;
          fs.appendFileSync(currentPaths.appLog, formattedLine, 'utf-8');

          // 4. Append JSON Lines to logs/frontend-<timestamp>.jsonl (For AI Agent and Tooling Analysis)
          fs.appendFileSync(currentPaths.jsonlLog, JSON.stringify(entry) + '\n', 'utf-8');

          // 5. If error, append to logs/frontend-error-<timestamp>.log for rapid error triaging
          if (entry.level === 'ERROR') {
            fs.appendFileSync(currentPaths.errorLog, formattedLine, 'utf-8');
          }
        });
      },
    },
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
    port: 8080,
    host: '0.0.0.0',
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
            if (id.includes("lucide-react")) {
              return "ui-icons";
            }
            if (id.includes("@supabase")) {
              return "supabase-vendor";
            }
            if (
              id.includes("/node_modules/react/") ||
              id.includes("/node_modules/react-dom/")
            ) {
              return "react-vendor";
            }
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
