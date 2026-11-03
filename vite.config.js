import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  base: mode === "production"
    ? "https://sak-assment.sakerp.org/"
    : "/",

  server: {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
    },
  },

  optimizeDeps: {
    include: [
      "antd/es/date-picker/locale/th_TH",
      "dayjs/plugin/buddhistEra",
      "dayjs/locale/th",
    ],
  },

  build: {
    cssCodeSplit: false,

    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: "assets/app.js",
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith(".css")) {
            return "assets/app.css";
          }
          return "assets/[name][extname]";
        },
      },
    }, 
  },
}));


//แบบเดิม
// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],
//   server: {
//     // Avoid keeping stale module URLs while developing. Vite's optimized
//     // dependency URLs contain a version hash, so an old browser cache can
//     // otherwise request a hash that is no longer available (504 Outdated
//     // Optimize Dep).
//     headers: {
//       "Cache-Control": "no-store, no-cache, must-revalidate",
//       Pragma: "no-cache",
//       Expires: "0",
//     },
//   },
//   optimizeDeps: {
//     // This page is lazy-loaded, so make Vite pre-bundle its CommonJS Day.js
//     // plugin and locale at startup. This preserves default-export interop and
//     // prevents a late dependency re-optimization when the page is first open.
//     include: [
//       "antd/es/date-picker/locale/th_TH",
//       "dayjs/plugin/buddhistEra",
//       "dayjs/locale/th",
//     ],
//   },
//   // base: "https://appncar.sakerp.org/SAKAssessment/",
// });
