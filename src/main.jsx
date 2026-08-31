import React from "react";
import ReactDOM from "react-dom/client";

import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";

import App from "./App";

import theme from "./theme/antdTheme";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ConfigProvider theme={theme}>
      <App />
    </ConfigProvider>
  </BrowserRouter>
);