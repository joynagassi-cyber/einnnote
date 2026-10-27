import { createRoot } from "react-dom/client";
import "@fontsource/literata/400.css";
import "@fontsource/literata/500.css";
import "@fontsource/literata/600.css";
import "@fontsource/literata/700.css";
import "@fontsource-variable/inter";
import "./index.css";
import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(<App />);
