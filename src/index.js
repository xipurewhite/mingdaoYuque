import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import "./style.less";
import "./styles/themes.css";
// 导入console包装器，用于控制生产环境的日志输出
// 发布版本时，请修改 src/utils/consoleWrapper.js 中的 ENABLE_DEBUG_LOGS 为 false
import "./utils/consoleWrapper";

const root = createRoot(document.querySelector("#app"));
root.render(<App />);
