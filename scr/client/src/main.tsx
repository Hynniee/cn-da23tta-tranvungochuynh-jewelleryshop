import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Notifications from "./components/Notifications";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "./style.css";
import "./typography.css";
import "./personal-tools.css";
import "./refinements.css";
import "./promotions.css";
import "./system.css";
import "./notifications.css";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
    <Notifications />
  </React.StrictMode>,
);
