import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Use mock SDK unless VITE_USE_REAL_SDK is explicitly set to "true"
  const isMock = process.env.VITE_USE_REAL_SDK !== 'true';

  const aliases = {
    "@": path.resolve(__dirname, "./src"),
  };

  if (isMock) {
    console.log("🛠️ Building with SDK Mock/Shim");
    aliases["@cnpdrrmceoc.vercel.app/sdk/dist/utils/axios-client"] = path.resolve(__dirname, "./src/lib/sdk-shim.js");
    aliases["@cnpdrrmceoc.vercel.app/sdk"] = path.resolve(__dirname, "./src/lib/sdk-shim.js");
  } else {
    console.log("🚀 Building with Real Production SDK");
  }

  return {
    plugins: [react()],
    resolve: {
      alias: aliases,
    },
    build: {
      chunkSizeWarningLimit: 2000,
    }
  }
})
