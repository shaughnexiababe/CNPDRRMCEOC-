import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isMock = mode === 'development' && !process.env.VITE_USE_REAL_SDK;

  const aliases = {
    "@": path.resolve(__dirname, "./src"),
  };

  if (isMock) {
    aliases["@cnpdrrmceoc.vercel.app/sdk/dist/utils/axios-client"] = path.resolve(__dirname, "./src/lib/sdk-shim.js");
    aliases["@cnpdrrmceoc.vercel.app/sdk"] = path.resolve(__dirname, "./src/lib/sdk-shim.js");
  }

  return {
    plugins: [react()],
    resolve: {
      alias: aliases,
    },
  }
})
