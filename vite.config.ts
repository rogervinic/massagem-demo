import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// base relativa para funcionar no GitHub Pages em qualquer nome de repositório
export default defineConfig({
  base: './',
  plugins: process.env.VITE_ARTIFACT ? [react(), viteSingleFile()] : [react()],
  test: { environment: 'node' },
} as any)
