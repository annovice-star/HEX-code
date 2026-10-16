import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
export default defineConfig({
  root:"github-pages",
  plugins:[react()],
  base:process.env.VITE_PAGES_BASE??"/HEX-code/",
  publicDir:resolve(process.cwd(),"public"),
  build:{outDir:resolve(process.cwd(),"pages-dist"),emptyOutDir:true},
  server:{host:"127.0.0.1",port:4173},
});
