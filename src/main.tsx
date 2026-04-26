
  import { createRoot } from "react-dom/client";
  import { MantineProvider } from "@mantine/core";
  import "@mantine/core/styles.css";
  import "@mantine/dates/styles.css";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <MantineProvider>
      <App />
    </MantineProvider>
  );
  
