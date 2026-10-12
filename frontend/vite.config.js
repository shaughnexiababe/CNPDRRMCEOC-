import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const aliases = {
    "@": path.resolve(__dirname, "./src"),
    "@shaughnexiababe/sdk": path.resolve(__dirname, "./src/lib/sdk-shim.js"),
  }

  return {
    plugins: [react()],
    resolve: {
      alias: aliases,
      dedupe: ["firebase", "axios"],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('firebase')) return 'vendor-firebase';
              if (id.includes('recharts')) return 'vendor-charts';
              if (id.includes('leaflet') || id.includes('esri-leaflet')) return 'vendor-maps';
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor-react';
            }
          }
        }
      }
    }
  }
})
