import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./App.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";

// Start MSW mock service worker in development only when VITE_USE_MOCK=true
// This lets you run dev against the real backend by leaving VITE_USE_MOCK unset/false
if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
  (async () => {
    try {
      // Use a runtime-only dynamic import so the bundler doesn't try to
      // resolve/mock modules during CI/production builds where `msw` is
      // not installed. The `@vite-ignore` comment tells Vite not to pre-bundle.
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const { worker } = await import(/* @vite-ignore */ "./mocks/browser");
      await worker.start();
    } catch (err) {
      // ignore if msw isn't installed or fails to start
    }
  })();
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
