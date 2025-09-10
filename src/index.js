import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./style.less";
import "./styles/themes.css";

const root = createRoot(document.querySelector("#app"));
root.render(<App />);
