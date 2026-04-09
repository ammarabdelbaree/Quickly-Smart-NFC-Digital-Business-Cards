import React from "react";
import ReactDOM from "react-dom/client";
import App from "./components/App";
import ErrorBoundary from "./components/ErrorBoundary";
import "./style/App.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);