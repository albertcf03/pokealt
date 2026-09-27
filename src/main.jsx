import React from "react";
import { createRoot } from "react-dom/client";
import PokealtStore from "./Pokealt.jsx";
import { createSupabaseBackend } from "./backend/supabase.js";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
import "./index.css";

// Las variables de entorno (Vercel o .env) mandan; si no están, se usa el proyecto de src/config.js.
const url = import.meta.env.VITE_SUPABASE_URL || SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || SUPABASE_PUBLISHABLE_KEY;

// Sin URL ni llave la tienda arranca en modo demo (datos en el navegador).
const backend = url && key ? createSupabaseBackend(url, key) : undefined;
if (!backend) console.info("PokeAlt: modo demo. Completa src/config.js para usar la base de datos.");

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PokealtStore backend={backend} />
  </React.StrictMode>
);
