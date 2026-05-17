import "./lib/instrument";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootLog } from "./lib/bootstrapLogger";

bootLog("boot", true);

const ROOT_SELECTOR = "#root";

function renderApp(): void {
  const rootEl = document.querySelector(ROOT_SELECTOR);
  if (!rootEl) {
    document.title = "Erreur";
    document.body.innerHTML = `<div id="root-error"><h1>Erreur de chargement</h1><p>Impossible de charger l'application. Veuillez rafraîchir la page.</p></div>`;
    return;
  }
  createRoot(rootEl).render(<App />);
}

renderApp();
