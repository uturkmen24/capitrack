import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // './' sayesinde site hangi alt adreste yayınlanırsa yayınlansın
  // (ör. GitHub Pages: uturkmen24.github.io/capitrack/) dosyalarını doğru bulur.
  base: './',
  plugins: [react(), tailwindcss()],
})
