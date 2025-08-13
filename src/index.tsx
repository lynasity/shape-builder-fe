import * as React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app";
import { prepareDesignEditor } from "@canva/intents/design";

import { AppUiProvider } from "@canva/app-ui-kit";
import "@canva/app-ui-kit/styles.css";

// Register Design Editor Intent as required by Canva Apps SDK v2
prepareDesignEditor({
  render: async () => {
    const rootElement = document.getElementById("root");
    if (!rootElement) {
      throw new Error("Unable to find element with id of 'root'");
    }

    const root = createRoot(rootElement);
    root.render(
      <AppUiProvider>
        <App />
      </AppUiProvider>
    );
  },
});

// Hot module replacement for development
if (module.hot) {
  module.hot.accept("./app", () => {
    // Note: Do NOT re-register the intent during hot reload
    // Intents must only be registered once as per Canva documentation
    // The render function will be called automatically by Canva when needed
  });
}
