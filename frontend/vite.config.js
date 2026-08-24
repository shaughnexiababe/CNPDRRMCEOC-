import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // NOTE: The app SDK is the local Firebase-backed shim in src/lib/sdk-shim.js.
  // The previous setup linked "@shaughnexiababe/sdk" via file:../sdk, which
  // broke production builds (Rollup could not resolve `firebase` from a
  // symlinked package outside frontend/node_modules). We always alias the
  // package name to the local shim so both `vite dev` and `vite build`
  // resolve identically, offline, with no registry token required.
  const aliases = {
    "@": path.resolve(__dirname, "./src"),
    "@shaughnexiababe/sdk": path.resolve(__dirname, "./src/lib/sdk-shim.js"),
  }

  return {
    plugins: [react()],
    resolve: {
      alias: aliases,
      // Make sure the SDK shim and the app share ONE copy of firebase/axios.
      dedupe: ["firebase", "axios"],
    },
    build: {
      chunkSizeWarningLimit: 2000,
    }
  }
})
