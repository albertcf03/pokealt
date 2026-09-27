/**
 * POKEALT (PokeAlt) — Tienda e-commerce de Pokémon TCG (Perú)
 * ------------------------------------------------------------------
 * Componente único React + Tailwind CSS + lucide-react.
 *
 * Arquitectura (pensada para migrar a backend sin reescribir la UI):
 *  1. CONFIGURACIÓN Y MOCK DATA  → STORE_INFO, INITIAL_PRODUCTS, catálogos.
 *  2. Backend                     → sin prop `backend` funciona en modo demo
 *                                   (localStorage). Con `backend` de Supabase
 *                                   (src/backend/supabase.js) usa base de datos
 *                                   real, cuentas y tiempo real.
 *  3. Utilidades                  → formato PEN, validaciones (Luhn, DNI/RUC).
 *  4. Componentes de UI           → Header, Hero, Catálogo, Carrito, Checkout,
 *                                   Admin, Libro de Reclamaciones, Legales…
 *  5. App                          → estado global centralizado y composición.
 *
 * Importante: los pagos, el QR y los números de hoja son SIMULADOS. En
 * producción integra el SDK oficial de Niubiz / Culqi / Mercado Pago (tokenización
 * en el navegador, cobro en el servidor) y nunca guardes datos de tarjeta.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ShoppingCart, Search, Settings, ShieldCheck, Lock, BadgeCheck, Truck, Store,
  MapPin, X, Plus, Minus, Trash2, Package, Sparkles, Flame, Droplets, Leaf, Zap,
  Moon, Shield, Star, Gavel, Timer, BookOpen, FileText, Cookie, Instagram,
  Youtube, MessageCircle, Music2, Bell, CreditCard, Smartphone,
  Upload, CheckCircle2, AlertTriangle, ChevronRight, ChevronLeft, Pencil,
  RotateCcw, Phone, Mail, Clock, Info, Copy, Layers, Box, Tag, Eye, EyeOff,
  ClipboardList, Users, SlidersHorizontal, Heart, User,
} from "lucide-react";

/* =================================================================
 * 1. CONFIGURACIÓN Y MOCK DATA
 * ================================================================= */

const STORE_INFO = {
  brand: "PokeAlt",
  email: "atencion@pokealt.pe",
  whatsapp: "+51 958 961 176",
  hours: "Lun a Sáb, 10:00 a 19:00",
};

// Plazo de entrega único para todas las modalidades
const DELIVERY_TIME = "2 días";

const CATEGORIES = ["Sellado", "Singles", "Accesorios", "Preventas"];

const RARITIES = [
  "Special Illustration Rare",
  "Hyper Rare",
  "Illustration Rare",
  "Ultra Rare",
  "Double Rare",
  "Producto sellado",
  "Accesorio",
];

const CONDITIONS = [
  "Sellado de fábrica",
  "Near Mint (NM)",
  "Lightly Played (LP)",
  "Moderately Played (MP)",
  "Heavily Played (HP)",
  "Nuevo",
];

// `image` acepta una URL/data-URI real, o una clave de arte generado:
// fire | water | grass | electric | psychic | dark | dragon | metal | fairy | colorless
const INITIAL_PRODUCTS = [
  {
    id: "p1", name: "Elite Trainer Box Evoluciones Prismáticas", set: "SV8.5 · Evoluciones Prismáticas",
    condition: "Sellado de fábrica", price: 459, stock: 3, category: "Sellado", image: "psychic",
    isFeatured: true, rarity: "Producto sellado", active: true,
    description: "Incluye 9 sobres, carta promo de Eevee, 65 fundas, dados y guía del set. Importación oficial en inglés.",
  },
  {
    id: "p2", name: "Booster Box Chispas Fulgurantes (36 sobres)", set: "SV08 · Surging Sparks",
    condition: "Sellado de fábrica", price: 689, stock: 5, category: "Sellado", image: "electric",
    isFeatured: false, rarity: "Producto sellado", active: true,
    description: "Caja display de 36 sobres con film original. Ideal para abrir en stream o guardar como inversión.",
  },
  {
    id: "p3", name: "Sobre suelto Rivales Predestinados", set: "SV10 · Destined Rivals",
    condition: "Sellado de fábrica", price: 22, stock: 120, category: "Sellado", image: "dark",
    isFeatured: false, rarity: "Producto sellado", active: true,
    description: "Sobre de 10 cartas. Límite de 20 unidades por pedido para cuidar el stock de la comunidad.",
  },
  {
    id: "p4", name: "Charizard ex 199/165", set: "SV 151", condition: "Near Mint (NM)", price: 1450,
    stock: 1, category: "Singles", image: "fire", isFeatured: true, rarity: "Special Illustration Rare",
    active: true, description: "Carta revisada con lupa: centrado 55/45, sin marcas en bordes. Se envía en top loader y bolsa sellada.",
  },
  {
    id: "p5", name: "Pikachu ex 238/191", set: "SV08 · Surging Sparks", condition: "Near Mint (NM)",
    price: 1290, stock: 2, category: "Singles", image: "electric", isFeatured: true,
    rarity: "Special Illustration Rare", active: true,
    description: "Una de las cartas más buscadas de la era Escarlata y Púrpura. Fotos reales disponibles por WhatsApp.",
  },
  {
    id: "p6", name: "Umbreon ex 161/131", set: "SV8.5 · Evoluciones Prismáticas", condition: "Near Mint (NM)",
    price: 3890, stock: 1, category: "Singles", image: "dark", isFeatured: true,
    rarity: "Special Illustration Rare", active: true,
    description: "Pieza de colección. Incluye verificación en video antes del envío y seguro de transporte.",
  },
  {
    id: "p7", name: "Mew ex 232/091 (Gold)", set: "SV4.5 · Paldean Fates", condition: "Lightly Played (LP)",
    price: 145, stock: 3, category: "Singles", image: "psychic", isFeatured: false, rarity: "Hyper Rare",
    active: true, description: "Leve desgaste en una esquina posterior (ver fotos). Frente en excelente estado.",
  },
  {
    id: "p8", name: "Gardevoir ex 245/198", set: "SV01 · Scarlet & Violet", condition: "Near Mint (NM)",
    price: 210, stock: 0, category: "Singles", image: "fairy", isFeatured: false,
    rarity: "Special Illustration Rare", active: true,
    description: "Activa la alerta de stock en nuestro canal de WhatsApp para enterarte de la reposición.",
  },
  {
    id: "p9", name: "Greninja ex 214/167", set: "SV06 · Twilight Masquerade", condition: "Near Mint (NM)",
    price: 780, stock: 2, category: "Singles", image: "water", isFeatured: false,
    rarity: "Special Illustration Rare", active: true, description: "Carta recién abierta, directo a funda. Sin whitening visible.",
  },
  {
    id: "p10", name: "Protectores Dragon Shield Matte (100 u.)", set: "Accesorio · Standard size",
    condition: "Nuevo", price: 55, stock: 40, category: "Accesorios", image: "colorless", isFeatured: false,
    rarity: "Accesorio", active: true, description: "Fundas mate de alta resistencia para cartas tamaño estándar (63 × 88 mm).",
  },
  {
    id: "p11", name: "Binder Vault X 9 bolsillos · 360 cartas", set: "Accesorio · Carpeta", condition: "Nuevo",
    price: 149, stock: 6, category: "Accesorios", image: "metal", isFeatured: false, rarity: "Accesorio",
    active: true, description: "Carpeta con cierre, bolsillos de carga lateral y páginas libres de ácido.",
  },
  {
    id: "p12", name: "Top Loaders 35pt (25 u.)", set: "Accesorio · Protección rígida", condition: "Nuevo",
    price: 18, stock: 3, category: "Accesorios", image: "colorless", isFeatured: false, rarity: "Accesorio",
    active: true, description: "Protección rígida para singles de valor. Compatible con fundas perfect fit.",
  },
  {
    id: "p13", name: "Preventa · Booster Box próxima expansión", set: "Por confirmar · Nov 2026",
    condition: "Sellado de fábrica", price: 720, stock: 10, category: "Preventas", image: "dragon",
    isFeatured: true, rarity: "Producto sellado", active: true,
    description: "Reserva con el 100% del pago. Precio congelado; se entrega la semana del lanzamiento oficial.",
  },
  {
    id: "p14", name: "Preventa · Elite Trainer Box próxima expansión", set: "Por confirmar · Nov 2026",
    condition: "Sellado de fábrica", price: 399, stock: 8, category: "Preventas", image: "grass",
    isFeatured: false, rarity: "Producto sellado", active: true,
    description: "Cupos limitados por DNI. Si la distribución oficial se retrasa, puedes pedir reembolso total.",
  },
];

const INITIAL_SETTINGS = {
  yapeNumber: "987 654 321",
  plinNumber: "987 654 321",
  walletHolder: "PokeAlt",
  lowStockThreshold: 3,
  freeShippingFrom: 500,
};

// Zonas de delivery en Lima Metropolitana y Callao (costos referenciales)
const LIMA_DISTRICTS = [
  ["Miraflores", 8], ["San Isidro", 8], ["Barranco", 8], ["Surquillo", 8], ["San Borja", 10],
  ["Santiago de Surco", 10], ["Lince", 10], ["Jesús María", 10], ["Magdalena del Mar", 10],
  ["Pueblo Libre", 10], ["San Miguel", 12], ["La Molina", 12], ["Breña", 12], ["Lima Cercado", 12],
  ["La Victoria", 12], ["Chorrillos", 12], ["San Luis", 12], ["Ate", 15], ["Los Olivos", 15],
  ["San Martín de Porres", 15], ["Independencia", 15], ["Comas", 18], ["San Juan de Lurigancho", 18],
  ["San Juan de Miraflores", 15], ["Villa El Salvador", 18], ["Villa María del Triunfo", 18],
  ["Callao", 15], ["Bellavista", 15], ["La Perla", 15], ["Puente Piedra", 20], ["Carabayllo", 20],
];

const DEPARTMENTS = [
  "Amazonas", "Áncash", "Apurímac", "Arequipa", "Ayacucho", "Cajamarca", "Cusco", "Huancavelica",
  "Huánuco", "Ica", "Junín", "La Libertad", "Lambayeque", "Lima Provincias", "Loreto", "Madre de Dios",
  "Moquegua", "Pasco", "Piura", "Puno", "San Martín", "Tacna", "Tumbes", "Ucayali",
];

const PICKUP_POINTS = [
  "Fullmarket",
  "Centro Comercial Arenales",
];

const COURIERS = {
  olva: { name: "Olva Courier", detail: "Entrega a domicilio", price: 18, eta: DELIVERY_TIME },
  shalom: { name: "Shalom", detail: "Recojo en agencia", price: 12, eta: DELIVERY_TIME },
};

const INITIAL_AUCTION = {
  title: "Charizard 4/102 Holo · Base Set",
  grade: "PSA 8 · Unlimited",
  startPrice: 1800,
  increment: 50,
  bids: [
    { alias: "Ash_Lima", amount: 2450, at: "hace 12 min" },
    { alias: "BrockCusco", amount: 2400, at: "hace 40 min" },
    { alias: "misty.aqp", amount: 2300, at: "hace 1 h" },
  ],
};

/* =================================================================
 * 2. DATA SERVICE (punto único de integración con el backend)
 * ================================================================= */

const dataService = {
  // TODO backend: GET /api/{key}
  load(key, fallback) {
    try {
      const raw = window.localStorage.getItem(`pokealt.${key}`);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  // TODO backend: PUT /api/{key}
  save(key, value) {
    try {
      window.localStorage.setItem(`pokealt.${key}`, JSON.stringify(value));
    } catch {
      /* almacenamiento no disponible: la app sigue funcionando en memoria */
    }
  },
};

function usePersistentState(key, fallback) {
  const [value, setValue] = useState(() => dataService.load(key, fallback));
  useEffect(() => dataService.save(key, value), [key, value]);
  return [value, setValue];
}

/* =================================================================
 * 3. UTILIDADES
 * ================================================================= */

// Formato de marca: S/ 1,250.50 (decimales solo si el monto no es entero)
const fmtPEN = (n) => {
  const v = Number(n || 0);
  const dec = Number.isInteger(v) ? 0 : 2;
  return "S/ " + v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
};

function stockStatus(p, threshold) {
  if (!p.active || p.stock <= 0) return { key: "out", label: "Agotado" };
  if (p.stock <= threshold) return { key: "low", label: "Pocas unidades" };
  return { key: "ok", label: "Disponible" };
}

const onlyDigits = (s) => String(s || "").replace(/\D/g, "");

function luhnValid(num) {
  const d = onlyDigits(num);
  if (d.length < 13) return false;
  let sum = 0;
  let alt = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = parseInt(d[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function cardBrand(num) {
  const d = onlyDigits(num);
  if (/^4/.test(d)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard";
  if (/^3[47]/.test(d)) return "amex";
  if (/^3(0[0-5]|[68])/.test(d)) return "diners";
  return null;
}

function formatCardNumber(v) {
  const d = onlyDigits(v).slice(0, 16);
  if (cardBrand(d) === "amex") return d.slice(0, 15).replace(/^(\d{0,4})(\d{0,6})(\d{0,5}).*/, (m, a, b, c) => [a, b, c].filter(Boolean).join(" "));
  return d.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function validateDoc(type, value) {
  const d = onlyDigits(value);
  if (type === "DNI") return d.length === 8 ? null : "El DNI tiene 8 dígitos.";
  if (type === "CE") return /^[A-Za-z0-9]{9,12}$/.test(String(value).trim()) ? null : "El CE tiene entre 9 y 12 caracteres.";
  if (type === "RUC") return d.length === 11 && /^(10|15|17|20)/.test(d) ? null : "El RUC tiene 11 dígitos y empieza en 10, 15, 17 o 20.";
  return "Selecciona un tipo de documento.";
}

const emailValid = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e).trim());
const phoneValid = (p) => /^9\d{8}$/.test(onlyDigits(p).replace(/^51/, ""));

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function addBusinessDays(date, days) {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) added++;
  }
  return d;
}

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });

function relTime(iso) {
  if (!iso) return "";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 45) return "ahora";
  if (s < 3600) return `hace ${Math.round(s / 60)} min`;
  if (s < 86400) return `hace ${Math.round(s / 3600)} h`;
  return `hace ${Math.round(s / 86400)} d`;
}

// Modo demo: todo vive en el navegador (localStorage). La tienda real recibe el backend de Supabase.
const localBackend = { mode: "local", cardPayments: true };

const newOrderId = () => "PKA-" + Date.now().toString(36).toUpperCase().slice(-6);

function copyText(text, onDone) {
  try {
    navigator.clipboard.writeText(text).then(() => onDone && onDone(true), () => onDone && onDone(false));
  } catch {
    onDone && onDone(false);
  }
}

/* =================================================================
 * 4. COMPONENTES DE UI
 * ================================================================= */

/* ---------- Sistema visual PokeAlt (tokens de marca) ---------- */
// Logo oficial de PokeAlt (emblema recortado y versión completa), embebidos para funcionar sin servidor.
// Al conectar un backend, reemplaza por la URL del archivo (p. ej. "/img/logo-pokealt.png").
const LOGO_EMBLEM = "data:image/jpeg;base64,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";
const LOGO_FULL = "data:image/jpeg;base64,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";

const FontStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Rubik:wght@600;700;800;900&family=Nunito+Sans:opsz,wght@6..12,400;6..12,600;6..12,700;6..12,800&family=JetBrains+Mono:wght@500;600;700&display=swap');
    .pk-root{
      --pika:#FFD21F;--pika-50:#FFFBE6;--pika-100:#FFF3B8;--pika-200:#FFE873;--pika-300:#FFDD3C;--pika-500:#F5BD00;--pika-600:#D69E00;--pika-700:#A87A00;
      --ember:#EE4E1E;--ember-h:#F76A35;--ember-d:#CC3A10;
      --ink:#2B2A26;--ink-strong:#1E1D1A;--ink-2:#57544C;--line:#E6E1D3;--paper:#FAF8F2;
      --ok:#1F9D55;--info:#2F6FE4;--err:#D92D20;
      font-family:'Nunito Sans',ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.5;
      background:var(--paper);color:var(--ink-strong);
    }
    .pk-body{font-family:'Nunito Sans',ui-sans-serif,system-ui,sans-serif}
    .pk-display{font-family:'Rubik','Nunito Sans',ui-sans-serif,system-ui,sans-serif;font-weight:800;letter-spacing:-0.02em}
    .pk-mono{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-variant-numeric:tabular-nums}
    .pk-balance{text-wrap:balance}
    .pk-eyebrow{font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
    .pk-root .rounded-xl{border-radius:16px}.pk-root .rounded-2xl{border-radius:20px}
    .pk-root input[type=checkbox],.pk-root input[type=radio]{accent-color:var(--ember);width:16px;height:16px}

    .bg-paper{background-color:var(--paper)}.bg-pika{background-color:var(--pika)}.bg-pika50{background-color:var(--pika-50)}.bg-pika100{background-color:var(--pika-100)}.bg-pika200{background-color:var(--pika-200)}
    .bg-ink{background-color:var(--ink)}.bg-ember{background-color:var(--ember)}.bg-okc{background-color:var(--ok)}
    .c-ink{color:var(--ink-strong)}.c-ink2{color:var(--ink-2)}.c-ember{color:var(--ember)}.c-pika{color:var(--pika)}.c-ok{color:var(--ok)}.c-err{color:var(--err)}.c-pika700{color:var(--pika-700)}
    .b-ink{border-color:var(--ink)}.b-line{border-color:var(--line)}.b-ember{border-color:var(--ember)}
    .ring-line{--tw-ring-color:var(--line)}.ring-ink{--tw-ring-color:var(--ink)}
    .pop-sm{box-shadow:0 2px 0 var(--ink)}.pop{box-shadow:0 4px 0 var(--ink)}.pop-lg{box-shadow:0 6px 0 var(--ink)}
    .soft{box-shadow:0 18px 40px -12px rgba(43,42,38,.35)}
    .halftone{background-color:var(--pika);background-image:radial-gradient(rgba(43,42,38,.13) 1.3px,transparent 1.6px),linear-gradient(180deg,var(--pika-200) 0%,var(--pika) 55%,var(--pika-500) 100%);background-size:14px 14px,100% 100%}
    .halftone-soft{background-color:var(--pika-100);background-image:radial-gradient(rgba(43,42,38,.10) 1.2px,transparent 1.5px);background-size:12px 12px}
    .halftone-ink{background-color:var(--ink);background-image:radial-gradient(rgba(255,210,31,.10) 1.2px,transparent 1.5px);background-size:14px 14px}

    .pk-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:2px solid var(--ink);border-radius:999px;font-weight:800;box-shadow:0 3px 0 var(--ink);transition:transform .12s cubic-bezier(.34,1.56,.64,1),box-shadow .12s,background-color .12s;white-space:nowrap;cursor:pointer}
    .pk-btn:active{transform:translateY(1px);box-shadow:0 2px 0 var(--ink)}
    .pk-btn:focus-visible{outline:none;border-color:var(--ember);box-shadow:0 3px 0 var(--ink),0 0 0 4px rgba(238,78,30,.28)}
    .pk-btn:disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none}
    .pk-btn.s-sm{height:34px;padding:0 14px;font-size:13px}.pk-btn.s-md{height:44px;padding:0 18px;font-size:15px}.pk-btn.s-lg{height:54px;padding:0 24px;font-size:17px}
    .v-primary{background:var(--pika);color:var(--ink-strong)}.v-primary:hover:not(:disabled){background:var(--pika-300)}
    .v-accent{background:var(--ember);color:#fff}.v-accent:hover:not(:disabled){background:var(--ember-h)}
    .v-dark{background:var(--ink);color:var(--pika)}.v-dark:hover:not(:disabled){background:#3b3a35}
    .v-outline{background:#fff;color:var(--ink-strong)}.v-outline:hover:not(:disabled){background:var(--pika-50)}
    .v-ghost{background:transparent;border-color:transparent;box-shadow:none;color:var(--ink-strong)}.v-ghost:hover:not(:disabled){background:rgba(43,42,38,.07)}
    .v-danger{background:var(--ember-d);color:#fff}.v-danger:hover:not(:disabled){background:var(--ember)}

    .pk-input{width:100%;height:46px;border:2px solid var(--ink);border-radius:14px;background:#fff;padding:0 14px;font-size:15px;color:var(--ink-strong);transition:box-shadow .12s,border-color .12s}
    textarea.pk-input{height:auto;padding:10px 14px}
    .pk-input::placeholder{color:#A09B8E}
    .pk-input:focus{outline:none;border-color:var(--ember);box-shadow:0 0 0 4px rgba(238,78,30,.22)}
    .pk-input.err{border-color:var(--err);background:#FEF3F2}
    .pk-input-sm{height:34px;border:2px solid var(--ink);border-radius:10px;background:#fff;padding:0 8px;font-size:13px}
    .pk-input-sm:focus{outline:none;border-color:var(--ember);box-shadow:0 0 0 3px rgba(238,78,30,.22)}

    .pk-card{background:#fff;border:2px solid var(--line);border-radius:20px;transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s,border-color .2s}
    .pk-card:hover{transform:translateY(-3px);border-color:var(--ink);box-shadow:0 4px 0 var(--ink)}
    .pk-frame{background:#fff;border:2px solid var(--ink);border-radius:20px;box-shadow:0 4px 0 var(--ink)}
    .pk-badge{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:2px 9px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;line-height:18px;white-space:nowrap}
    .pk-sel{--tw-ring-color:var(--ink);background:var(--pika-50);box-shadow:0 0 0 2px var(--ink),0 3px 0 2px var(--ink)!important}
    .pk-unsel{--tw-ring-color:var(--line)}
    .pk-tab{border:2px solid transparent;border-radius:999px;padding:6px 14px;font-weight:800;font-size:14px;white-space:nowrap;transition:background .12s}
    .pk-tab:hover{background:rgba(43,42,38,.08)}
    .pk-tab.on{background:var(--ink);color:var(--pika);border-color:var(--ink)}
    .pk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:18px}
    .pk-wordmark{font-family:'Rubik',sans-serif;font-weight:900;letter-spacing:-0.03em;color:var(--ink-strong);text-shadow:0 1px 0 #fff,0 3px 0 rgba(43,42,38,.28)}
    .pk-wordmark.inv{color:var(--pika);text-shadow:0 3px 0 #000}
    .pk-holo{position:relative;overflow:hidden}
    .pk-holo::after{content:"";position:absolute;inset:-50%;background:linear-gradient(115deg,transparent 38%,rgba(255,255,255,.55) 46%,rgba(255,236,120,.35) 50%,rgba(160,220,255,.3) 54%,transparent 62%);transform:translateX(-60%);animation:pkShine 4.5s ease-in-out infinite;pointer-events:none}
    @keyframes pkShine{0%,15%{transform:translateX(-60%)}60%,100%{transform:translateX(60%)}}
    @keyframes pkPop{0%{transform:scale(.9);opacity:0}100%{transform:scale(1);opacity:1}}
    .pk-in{animation:pkPop .2s cubic-bezier(.34,1.56,.64,1)}
    @keyframes pkPulse{0%,100%{opacity:1}50%{opacity:.35}}
    .pk-live-dot{width:7px;height:7px;border-radius:999px;background:#fff;animation:pkPulse 1.2s infinite}
    @media (prefers-reduced-motion: reduce){.pk-holo::after{animation:none;display:none}.pk-in,.pk-live-dot{animation:none}.pk-card:hover{transform:none}}
  `}</style>
);

// Arte por tipo de energía (se usa cuando no hay imagen real del producto)
const ART = {
  fire: { bg: "from-orange-400 via-red-500 to-red-700", Icon: Flame },
  water: { bg: "from-sky-300 via-sky-500 to-blue-700", Icon: Droplets },
  grass: { bg: "from-lime-300 via-green-500 to-emerald-700", Icon: Leaf },
  electric: { bg: "from-yellow-200 via-amber-400 to-orange-500", Icon: Zap },
  psychic: { bg: "from-pink-300 via-fuchsia-500 to-fuchsia-700", Icon: Sparkles },
  dark: { bg: "from-stone-500 via-stone-700 to-stone-900", Icon: Moon },
  dragon: { bg: "from-amber-300 via-orange-500 to-red-800", Icon: Star },
  metal: { bg: "from-zinc-200 via-zinc-400 to-zinc-600", Icon: Shield },
  fairy: { bg: "from-rose-200 via-pink-400 to-rose-600", Icon: Sparkles },
  colorless: { bg: "from-stone-100 via-stone-300 to-stone-500", Icon: Layers },
};

// Colores de rareza de la guía de marca
const RARITY_COLOR = {
  "Special Illustration Rare": "#E5332A",
  "Hyper Rare": "#D69E00",
  "Ultra Rare": "#D69E00",
  "Illustration Rare": "#7B4FE0",
  "Double Rare": "#2F6FE4",
  "Producto sellado": "#7A766B",
  Accesorio: "#7A766B",
};

function RarityBadge({ rarity }) {
  const c = RARITY_COLOR[rarity] || "#7A766B";
  return (
    <span className="pk-badge" style={{ background: c + "1A", color: c, boxShadow: `inset 0 0 0 1.5px ${c}` }}>
      {rarity}
    </span>
  );
}

const CONDITION_SHORT = (c) => (c.match(/\((\w+)\)/) || [])[1] || null;

function ConditionBadge({ condition }) {
  const short = CONDITION_SHORT(condition);
  const tips = {
    NM: "Near Mint: sin desgaste visible o mínimo.",
    LP: "Lightly Played: desgaste leve en bordes o esquinas.",
    MP: "Moderately Played: desgaste visible, sin dobleces.",
    HP: "Heavily Played: desgaste notorio o marcas.",
  };
  if (!short) return <span className="pk-badge bg-paper c-ink2" style={{ boxShadow: "inset 0 0 0 1.5px var(--line)" }}>{condition}</span>;
  return (
    <span title={tips[short]} className="pk-badge cursor-help" style={{ background: short === "NM" ? "#1F9D55" : "#57544C", color: "#fff" }}>
      {short}
    </span>
  );
}

/** Arte del producto: imagen real si existe; si no, carta/caja ilustrada sobre amarillo halftone. */
function ProductArt({ product, size = "md", plain = false }) {
  const isUrl = /^(https?:|data:)/.test(product.image || "");
  const art = ART[product.image] || ART.colorless;
  const Icon = art.Icon;
  const holo = ["Special Illustration Rare", "Hyper Rare"].includes(product.rarity);
  const big = size === "lg";
  let inner;
  if (isUrl) {
    inner = <img src={product.image} alt={product.name} className={`${big ? "w-56" : "w-28"} rounded-xl border-2 b-ink soft`} />;
  } else if (product.category === "Singles") {
    inner = (
      <div className={`${big ? "w-44 h-60" : "w-24 h-32"} rounded-xl bg-pika border-2 b-ink p-1.5 soft rotate-3 ${holo ? "pk-holo" : ""}`}>
        <div className={`w-full h-full rounded-lg bg-gradient-to-br ${art.bg} flex flex-col border b-ink`}>
          <div className="h-3/5 m-1 rounded bg-white/25 flex items-center justify-center">
            <Icon className={`${big ? "w-14 h-14" : "w-8 h-8"} text-white drop-shadow`} strokeWidth={2} />
          </div>
          <div className="mx-1.5 space-y-1">
            <div className="h-1 rounded bg-white/60 w-4/5" />
            <div className="h-1 rounded bg-white/45 w-3/5" />
            <div className="h-1 rounded bg-white/35 w-2/3" />
          </div>
        </div>
      </div>
    );
  } else if (product.category === "Accesorios") {
    inner = (
      <div className={`${big ? "w-40 h-40" : "w-24 h-24"} rounded-2xl bg-white border-2 b-ink pop flex items-center justify-center -rotate-3`}>
        <Icon className={`${big ? "w-16 h-16" : "w-10 h-10"} c-ink`} strokeWidth={2} />
      </div>
    );
  } else {
    inner = (
      <div className={`${big ? "w-44 h-48" : "w-28 h-28"} relative -rotate-2`}>
        <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${art.bg} border-2 b-ink pop pk-holo`} />
        <div className="absolute inset-x-2.5 top-2.5 h-1/3 rounded-md bg-white/30" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Package className={`${big ? "w-14 h-14" : "w-9 h-9"} text-white drop-shadow`} strokeWidth={2} />
        </div>
        <div className="absolute bottom-2.5 left-2.5 right-2.5 h-2 rounded bg-black/25" />
      </div>
    );
  }
  return (
    <div className={`w-full h-full ${plain ? "bg-pika" : "halftone"} relative flex items-center justify-center overflow-hidden`}>
      <div className="relative">{inner}</div>
    </div>
  );
}

function StockTag({ product, threshold }) {
  const s = stockStatus(product, threshold);
  if (s.key === "out")
    return <span className="pk-badge bg-paper c-ink2" style={{ boxShadow: "inset 0 0 0 1.5px var(--line)" }}>Agotado</span>;
  if (s.key === "low")
    return <span className="pk-badge bg-ember text-white">¡Quedan {product.stock}!</span>;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold c-ok">
      <span className="w-2 h-2 rounded-full bg-okc" /> {product.stock} en stock
    </span>
  );
}

function Modal({ open, onClose, title, subtitle, children, size = "max-w-2xl", icon: Icon }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`pk-in relative w-full ${size} max-h-full overflow-y-auto bg-white border-2 b-ink pop-lg rounded-t-3xl sm:rounded-3xl`}>
        <div className="sticky top-0 z-10 halftone border-b-2 b-ink px-5 py-4 flex items-start gap-3">
          {Icon && (
            <div className="mt-0.5 w-10 h-10 rounded-full bg-ink c-pika flex items-center justify-center shrink-0 border-2 b-ink">
              <Icon className="w-5 h-5" strokeWidth={2.2} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="pk-display text-xl c-ink pk-balance leading-tight">{title}</h2>
            {subtitle && <p className="text-sm c-ink2 font-semibold">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="pk-btn v-outline s-sm !px-2 w-9" aria-label="Cerrar">
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, error, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="block pk-eyebrow c-ink2 mb-1.5">{label}</span>
      {children}
      {error ? (
        <span className="block mt-1 text-xs font-bold c-err">{error}</span>
      ) : hint ? (
        <span className="block mt-1 text-xs c-ink2">{hint}</span>
      ) : null}
    </label>
  );
}

const inputCls = (err) => `pk-input ${err ? "err" : ""}`;

function Btn({ variant = "primary", size = "md", className = "", children, ...props }) {
  return (
    <button className={`pk-btn v-${variant} s-${size} ${className}`} {...props}>
      {children}
    </button>
  );
}

/* ---------- Marca y logos de pago (dibujados, sin imágenes externas) ---------- */

function LogoMark({ size = 44 }) {
  return <img src={LOGO_EMBLEM} alt="" aria-hidden="true" style={{ height: size, width: "auto" }} className="shrink-0 rounded-xl" />;
}

function Logo({ light = false, size = 54 }) {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <LogoMark size={size} />
      <div className="leading-none">
        <div className={`pk-wordmark ${light ? "inv" : ""} text-2xl sm:text-3xl`}>PokeAlt</div>
        <div className={`text-xs font-extrabold tracking-widest uppercase ${light ? "text-white/60" : "c-ink2"}`}>TCG Store · Perú</div>
      </div>
    </div>
  );
}

function PayLogo({ kind }) {
  const base = "h-8 px-2.5 rounded-lg flex items-center justify-center text-xs font-extrabold shrink-0 border-2 b-ink";
  switch (kind) {
    case "yape":
      return <div className={`${base} text-white lowercase italic`} style={{ background: "#742284" }}>yape</div>;
    case "plin":
      return <div className={`${base} text-white lowercase`} style={{ background: "#00BFB3" }}>plin</div>;
    case "visa":
      return <div className={`${base} bg-white italic tracking-tight`} style={{ color: "#1A1F71" }}>VISA</div>;
    case "mastercard":
      return (
        <div className={`${base} bg-white gap-0`}>
          <span className="w-4 h-4 rounded-full" style={{ background: "#EB001B" }} />
          <span className="w-4 h-4 rounded-full -ml-1.5 opacity-90" style={{ background: "#F79E1B" }} />
        </div>
      );
    case "amex":
      return <div className={`${base} text-white tracking-tighter`} style={{ background: "#2E77BC" }}>AMEX</div>;
    case "diners":
      return <div className={`${base} bg-white c-ink`}>Diners</div>;
    default:
      return null;
  }
}

/** Ícono del Libro de Reclamaciones (libro abierto con marca). */
function ReclamacionesIcon({ className = "w-10 h-10" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="4" y="8" width="40" height="32" rx="3" fill="#fff" stroke="#2B2A26" strokeWidth="2.5" />
      <line x1="24" y1="9" x2="24" y2="39" stroke="#2B2A26" strokeWidth="2.5" />
      <line x1="9" y1="16" x2="19" y2="16" stroke="#2B2A26" strokeWidth="2" />
      <line x1="9" y1="22" x2="19" y2="22" stroke="#2B2A26" strokeWidth="2" />
      <line x1="9" y1="28" x2="17" y2="28" stroke="#2B2A26" strokeWidth="2" />
      <path d="M29 22 l4 4 l8 -9" fill="none" stroke="#EE4E1E" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- QR simulado dinámico ---------- */

function FakeQR({ seed, color = "#2B2A26", badge, badgeColor }) {
  const N = 29;
  const cells = useMemo(() => {
    let s = hashString(seed) || 1;
    const rnd = () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s >>> 0) % 1000) / 1000;
    };
    const out = [];
    const inFinder = (x, y) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const c = x > 10 && x < 18 && y > 10 && y < 18;
        if (!inFinder(x, y) && !c && rnd() > 0.52) out.push([x, y]);
      }
    return out;
  }, [seed]);
  const finder = (x, y) => (
    <g key={`f${x}${y}`}>
      <rect x={x} y={y} width="7" height="7" fill={color} />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill={color} />
    </g>
  );
  return (
    <svg viewBox={`-1 -1 ${N + 2} ${N + 2}`} className="w-full h-full" role="img" aria-label="Código QR simulado">
      <rect x="-1" y="-1" width={N + 2} height={N + 2} fill="#fff" />
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1.02" height="1.02" fill={color} />
      ))}
      {finder(0, 0)}
      {finder(N - 7, 0)}
      {finder(0, N - 7)}
      <rect x="11" y="11" width="7" height="7" rx="1.5" fill={badgeColor} />
      <text x="14.5" y="15.4" textAnchor="middle" fontSize="2.6" fontWeight="800" fill="#fff" fontFamily="sans-serif">
        {badge}
      </text>
    </svg>
  );
}

/* ---------- Header ---------- */

function Header({ query, setQuery, category, setCategory, cartCount, onCart, onAdmin, adminMode, onClaims, favCount, onlyFavs, setOnlyFavs, settings, remote, isAdmin, profile, onAccount }) {
  const goCatalog = () => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <header className="sticky top-0 z-40 bg-pika border-b-2 b-ink">
      <div className="bg-ink text-white text-xs font-bold">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-1.5 flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 truncate">
            <Truck className="w-3.5 h-3.5 shrink-0 c-pika" /> Delivery gratis en Lima desde {fmtPEN(settings.freeShippingFrom)} · Paga con Yape, Plin o tarjeta · Envíos a todo el Perú
          </span>
          <button onClick={onClaims} className="hidden sm:flex items-center gap-1 c-pika hover:underline underline-offset-2 shrink-0">
            <BookOpen className="w-3.5 h-3.5" /> Libro de Reclamaciones
          </button>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
        <a href="#top" aria-label="PokeAlt inicio"><Logo /></a>
        <div className="hidden lg:flex items-center gap-1 ml-2">
          <a href="#catalogo" className="pk-tab on">Tienda</a>
          <a href="#subasta" className="pk-tab c-ink">Subastas</a>
        </div>
        <div className="order-3 md:order-none w-full md:w-auto md:flex-1 relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 c-ink" strokeWidth={2.5} />
          <input
            id="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value) goCatalog();
            }}
            placeholder="Busca Charizard, Pikachu, sets…"
            className="pk-input !rounded-full !pl-10 !pr-10"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 c-ink2 " aria-label="Limpiar búsqueda">
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => { setOnlyFavs(!onlyFavs); goCatalog(); }}
            className={`pk-btn s-md !px-3 relative ${onlyFavs ? "v-dark" : "v-outline"}`}
            aria-label={`Favoritos, ${favCount}`}
            aria-pressed={onlyFavs}
          >
            <Heart className="w-4 h-4" strokeWidth={2.5} fill={onlyFavs ? "currentColor" : "none"} />
            {favCount > 0 && <span className="pk-mono text-xs">{favCount}</span>}
          </button>
          {remote && (
            <button onClick={onAccount} className="pk-btn v-outline s-md !px-3" aria-label="Mi cuenta">
              <User className="w-4 h-4" strokeWidth={2.5} /> <span className="hidden sm:inline max-w-28 truncate">{profile ? profile.alias || "Mi cuenta" : "Ingresar"}</span>
            </button>
          )}
          {isAdmin && (
            <button onClick={onAdmin} className={`pk-btn s-md !px-3 ${adminMode ? "v-dark" : "v-outline"}`} aria-label="Administración">
              <Settings className="w-4 h-4" strokeWidth={2.5} /> <span className="hidden sm:inline">Admin</span>
            </button>
          )}
          <button onClick={onCart} className="pk-btn v-dark s-md relative" aria-label={`Carrito, ${cartCount} unidades`}>
            <ShoppingCart className="w-4 h-4" strokeWidth={2.5} /> <span className="hidden sm:inline">Carrito</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 min-w-6 h-6 px-1.5 rounded-full bg-ember text-white text-xs flex items-center justify-center pk-mono border-2 b-ink">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
      <nav className="max-w-6xl mx-auto px-4 sm:px-6 pb-2.5 flex gap-1.5 overflow-x-auto">
        {["Todos", ...CATEGORIES].map((c) => (
          <button
            key={c}
            onClick={() => { setCategory(c); goCatalog(); }}
            className={`pk-tab ${category === c ? "on" : "c-ink"}`}
          >
            {c}
          </button>
        ))}
      </nav>
    </header>
  );
}

/* ---------- Hero + Subasta ---------- */

function useCountdown(endAt) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, endAt - now);
  const s = Math.floor(ms / 1000);
  return { ms, d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

const maskAlias = (a) => (a.length <= 3 ? a[0] + "**" : a.slice(0, 2) + "***" + a.slice(-2));

function AuctionCard({ auction, onBid, notify, remote, profile, onNeedAccount }) {
  const t = useCountdown(auction.endAt);
  const top = auction.bids[0]?.amount || auction.startPrice;
  const minBid = top + auction.increment;
  const bidCount = auction.bidCount ?? auction.bids.length;
  const [alias, setAlias] = useState("");
  const [amount, setAmount] = useState(minBid);
  const [err, setErr] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  useEffect(() => setAmount((a) => (a < minBid ? minBid : a)), [minBid]);
  const ended = t.ms === 0;
  const urgent = !ended && t.ms < 3600 * 1000;
  const myAlias = remote ? profile?.alias : alias.trim();
  const profileReady = !remote || (profile && profile.alias && profile.docNumber && profile.fullName);

  // Aviso cuando otra persona supera tu puja
  const leader = auction.bids[0]?.alias;
  const prevLeader = useRef(leader);
  useEffect(() => {
    if (prevLeader.current && myAlias && prevLeader.current === myAlias && leader && leader !== myAlias) {
      notify(`¡Te superaron! La puja ahora es ${fmtPEN(top)}.`, "error");
    }
    prevLeader.current = leader;
  }, [leader]); // eslint-disable-line react-hooks/exhaustive-deps

  const review = (e) => {
    e.preventDefault();
    if (remote && !profileReady) return onNeedAccount();
    if (!remote && !alias.trim()) return setErr("Escribe tu alias de coleccionista.");
    if (Number(amount) < minBid) return setErr(`La puja mínima es ${fmtPEN(minBid)}.`);
    setErr("");
    setConfirming(true);
  };
  const confirm = async () => {
    setSending(true);
    try {
      await onBid(myAlias, Number(amount));
      prevLeader.current = myAlias;
      setConfirming(false);
      notify(`¡Vas ganando! Tu puja de ${fmtPEN(amount)} lidera la subasta.`);
    } catch (e2) {
      setConfirming(false);
      setErr(e2.message || "No pudimos registrar tu puja.");
    } finally {
      setSending(false);
    }
  };

  const unit = (v, l) => (
    <div className={`text-center rounded-xl border-2 b-ink py-1.5 ${urgent ? "bg-ember text-white" : "bg-white c-ink"}`}>
      <div className="pk-mono text-xl font-bold leading-none">{String(v).padStart(2, "0")}</div>
      <div className={`text-xs font-extrabold uppercase mt-0.5 ${urgent ? "text-white/80" : "c-ink2"}`}>{l}</div>
    </div>
  );

  return (
    <div className="pk-frame overflow-hidden !rounded-3xl pop-lg">
      <div className="halftone border-b-2 b-ink p-4 flex gap-4 items-center">
        <div className="w-24 h-32 shrink-0">
          <ProductArt product={{ image: auction.image || "fire", category: "Singles", rarity: "Hyper Rare", name: auction.title }} plain />
        </div>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <span className={`pk-badge ${ended ? "bg-ink text-white" : "bg-ember text-white"}`}>
              {!ended && <span className="pk-live-dot" />} {ended ? "Finalizada" : "En vivo"}
            </span>
            {auction.grade && <span className="pk-badge bg-ink c-pika">{auction.grade.split("·")[0].trim()}</span>}
          </div>
          <div className="pk-display text-lg c-ink leading-tight">{auction.title}</div>
          <div className="text-xs font-bold c-ink2">{auction.grade}</div>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="pk-eyebrow c-ink2">{bidCount ? "Puja actual" : "Precio base"}</div>
            <div className="pk-mono text-3xl font-bold c-ink leading-tight">{fmtPEN(top)}</div>
          </div>
          <div className="text-right text-xs font-bold c-ink2">
            <Gavel className="w-4 h-4 inline -mt-0.5" /> {bidCount} {bidCount === 1 ? "puja" : "pujas"}
          </div>
        </div>
        <div>
          <div className="pk-eyebrow c-ink2 mb-1.5 flex items-center gap-1"><Timer className="w-3.5 h-3.5" /> Termina en</div>
          <div className="grid grid-cols-4 gap-1.5">
            {unit(t.d, "días")}{unit(t.h, "hrs")}{unit(t.m, "min")}{unit(t.s, "seg")}
          </div>
        </div>

        {confirming ? (
          <div className="pk-in rounded-2xl border-2 b-ink bg-pika50 p-3 space-y-2">
            <div className="pk-display c-ink">Confirmar puja</div>
            <p className="text-sm c-ink2">
              Vas a pujar <strong className="pk-mono c-ink">{fmtPEN(amount)}</strong> como <strong>{myAlias}</strong>. La puja es vinculante: si ganas, tienes 24 horas para pagar.
            </p>
            <div className="flex gap-2">
              <Btn variant="accent" size="sm" onClick={confirm} disabled={sending}>{sending ? "Enviando…" : "Confirmar puja"}</Btn>
              <Btn variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={sending}>Cancelar</Btn>
            </div>
          </div>
        ) : (
          <form onSubmit={review} className="grid grid-cols-2 gap-2">
            {remote ? (
              <div className="pk-input flex items-center gap-2 bg-paper font-bold truncate">
                <User className="w-4 h-4 shrink-0" /> {profile?.alias || "Sin sesión"}
              </div>
            ) : (
              <input id="auction-alias" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Tu alias" className="pk-input" />
            )}
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pk-mono text-sm font-bold c-ink2">S/</span>
              <input id="auction-amount" type="number" min={minBid} step={auction.increment} value={amount} onChange={(e) => setAmount(e.target.value)} className="pk-input pk-mono !pl-9" />
            </div>
            <Btn variant="accent" size="lg" type="submit" disabled={ended} className="col-span-2">
              <Gavel className="w-5 h-5" strokeWidth={2.5} />
              {remote && !profile ? "Ingresa para pujar" : remote && !profileReady ? "Completa tu perfil para pujar" : "Pujar ahora"}
            </Btn>
            <p className="col-span-2 text-xs c-ink2 -mt-1">Puja mínima {fmtPEN(minBid)} · incrementos de {fmtPEN(auction.increment)}</p>
            {err && <p className="col-span-2 text-xs font-bold c-err">{err}</p>}
          </form>
        )}

        <ul className="divide-y b-line border-t-2 b-line pt-1">
          {auction.bids.slice(0, 3).map((b, i) => (
            <li key={i} className="flex items-center justify-between py-1.5 text-sm">
              <span className="flex items-center gap-2 font-bold c-ink">
                {maskAlias(b.alias)}
                {i === 0 && <span className="pk-badge bg-pika c-ink border-2 b-ink !py-0">Líder</span>}
                <span className="text-xs font-semibold c-ink2">{b.at || relTime(b.createdAt)}</span>
              </span>
              <span className="pk-mono font-bold">{fmtPEN(b.amount)}</span>
            </li>
          ))}
          {auction.bids.length === 0 && <li className="py-2 text-sm c-ink2">Aún no hay pujas. ¡Sé el primero!</li>}
        </ul>
      </div>
    </div>
  );
}

function Hero({ featured, onView, onAdd, auction, onBid, notify, threshold, remote, profile, onNeedAccount, loading }) {
  const star = featured[0];
  return (
    <section id="top" className="halftone border-b-2 b-ink">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 grid lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-7">
          <span className="pk-badge bg-white c-ink border-2 b-ink pop-sm !text-xs !py-1">
            <BadgeCheck className="w-4 h-4 c-ok" /> 100% original · importación oficial
          </span>
          <h1 className="pk-display pk-balance mt-5 text-4xl sm:text-5xl lg:text-6xl c-ink leading-none" style={{ letterSpacing: "-0.03em", fontWeight: 900 }}>
            Tu próxima carta favorita está a una puja.
          </h1>
          <p className="mt-5 c-ink text-lg max-w-xl font-semibold" style={{ opacity: 0.85 }}>
            Sellado, singles y preventas de Pokémon TCG revisados uno por uno. Paga con Yape, Plin o tarjeta y recibe en todo el Perú con Olva Courier y Shalom.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Btn variant="dark" size="lg" onClick={() => document.getElementById("catalogo")?.scrollIntoView({ behavior: "smooth" })}>
              Ir a la tienda <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
            </Btn>
            <Btn variant="outline" size="lg" onClick={() => document.getElementById("subasta")?.scrollIntoView({ behavior: "smooth" })}>
              <Gavel className="w-5 h-5" strokeWidth={2.5} /> Ver subastas
            </Btn>
          </div>
          {star && (
            <div className="mt-8 pk-frame p-3 flex items-center gap-4 max-w-lg">
              <button onClick={() => onView(star)} className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 border-2 b-ink">
                <ProductArt product={star} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="pk-eyebrow c-ember">Destacado</div>
                <div className="pk-display c-ink truncate">{star.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="pk-mono font-bold">{fmtPEN(star.price)}</span>
                  <StockTag product={star} threshold={threshold} />
                </div>
              </div>
              <Btn size="md" className="!px-3" onClick={() => onAdd(star)} disabled={stockStatus(star, threshold).key === "out"} aria-label="Agregar destacado">
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </Btn>
            </div>
          )}
        </div>
        <div id="subasta" className="lg:col-span-5 scroll-mt-40">
          {auction ? (
            <AuctionCard auction={auction} onBid={onBid} notify={notify} remote={remote} profile={profile} onNeedAccount={onNeedAccount} />
          ) : loading ? (
            <div className="pk-frame p-6 text-center">
              <span className="inline-block w-8 h-8 rounded-full border-4 b-ink border-t-transparent animate-spin" />
              <p className="pk-display c-ink mt-2">Cargando subasta…</p>
            </div>
          ) : (
            <div className="pk-frame p-6 text-center">
              <Gavel className="w-8 h-8 mx-auto c-ink" />
              <p className="pk-display c-ink mt-2">No hay subastas activas</p>
              <p className="text-sm c-ink2">Activa las alertas de WhatsApp para enterarte de la próxima.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TrustStrip() {
  const items = [
    { Icon: BadgeCheck, t: "100% original", d: "Reembolso total si no es auténtico" },
    { Icon: Shield, t: "Lo que ves es lo que recibes", d: "Top loader + sleeve en cada single" },
    { Icon: Truck, t: "Envío a todo el Perú", d: "Olva Courier · Shalom · delivery Lima" },
    { Icon: Lock, t: "Checkout cifrado SSL", d: "Libro de Reclamaciones virtual" },
  ];
  return (
    <section className="bg-white border-b-2 b-ink">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-4">
        {items.map(({ Icon, t, d }) => (
          <div key={t} className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-pika border-2 b-ink pop-sm c-ink flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-extrabold c-ink leading-tight">{t}</div>
              <div className="text-xs c-ink2">{d}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------- Catálogo ---------- */

function ProductCard({ product, threshold, inCart, onAdd, onView, isFav, toggleFav }) {
  const s = stockStatus(product, threshold);
  const remaining = product.stock - inCart;
  const canAdd = s.key !== "out" && remaining > 0;
  return (
    <article className="pk-card flex flex-col overflow-hidden">
      <div className="relative aspect-square w-full border-b-2 b-line">
        <button onClick={() => onView(product)} className="w-full h-full focus:outline-none" aria-label={`Ver ${product.name}`}>
          <ProductArt product={product} />
        </button>
        <div className="absolute top-2.5 left-2.5 flex flex-col items-start gap-1">
          {product.isFeatured && <span className="pk-badge bg-ink c-pika"><Star className="w-3 h-3" fill="currentColor" /> Destacado</span>}
          {product.category === "Preventas" && <span className="pk-badge bg-white c-ink border-2 b-ink">Preventa</span>}
        </div>
        <button
          onClick={() => toggleFav(product.id)}
          className={`absolute top-2.5 right-2.5 w-9 h-9 rounded-full border-2 b-ink pop-sm flex items-center justify-center ${isFav ? "bg-ember text-white" : "bg-white c-ink"}`}
          aria-label={isFav ? "Quitar de favoritos" : "Agregar a favoritos"}
          aria-pressed={isFav}
        >
          <Heart className="w-4 h-4" strokeWidth={2.5} fill={isFav ? "currentColor" : "none"} />
        </button>
        {s.key === "out" && (
          <span className="absolute inset-0 bg-white/55 flex items-center justify-center pointer-events-none">
            <span className="rotate-6 pk-badge bg-ink text-white !text-sm !px-4 !py-1">Agotado</span>
          </span>
        )}
      </div>
      <div className="flex-1 flex flex-col p-3.5 gap-2">
        <div className="flex flex-wrap gap-1">
          <RarityBadge rarity={product.rarity} />
          <ConditionBadge condition={product.condition} />
        </div>
        <h3 className="pk-display text-base c-ink leading-snug line-clamp-2">{product.name}</h3>
        <div className="text-xs c-ink2 truncate font-semibold">{product.set}</div>
        <div className="mt-auto pt-1 flex items-center justify-between gap-2">
          <div className="pk-mono text-xl font-bold c-ink">{fmtPEN(product.price)}</div>
          <StockTag product={product} threshold={threshold} />
        </div>
        <Btn size="sm" onClick={() => onAdd(product)} disabled={!canAdd} className="w-full">
          <ShoppingCart className="w-4 h-4" strokeWidth={2.5} />
          {s.key === "out" ? "Sin stock" : remaining <= 0 ? "Máximo en carrito" : "Agregar al carrito"}
        </Btn>
      </div>
    </article>
  );
}

function Catalog({ products, threshold, query, category, setCategory, cart, onAdd, onView, favs, toggleFav, onlyFavs, setOnlyFavs, loading }) {
  const [rarities, setRarities] = useState([]);
  const [stockF, setStockF] = useState("all");
  const [sort, setSort] = useState("featured");
  const [showFilters, setShowFilters] = useState(false);

  const base = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category !== "Todos" && p.category !== category) return false;
      if (onlyFavs && !favs.includes(p.id)) return false;
      if (q && !`${p.name} ${p.set} ${p.rarity} ${p.condition}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [products, query, category, onlyFavs, favs]);

  const list = useMemo(() => {
    const r = base.filter((p) => {
      if (rarities.length && !rarities.includes(p.rarity)) return false;
      if (stockF !== "all" && stockStatus(p, threshold).key !== stockF) return false;
      return true;
    });
    const sorters = {
      featured: (a, b) => Number(b.isFeatured) - Number(a.isFeatured),
      priceAsc: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price,
      name: (a, b) => a.name.localeCompare(b.name, "es"),
    };
    return [...r].sort(sorters[sort]);
  }, [base, rarities, stockF, sort, threshold]);

  const toggleRarity = (r) => setRarities((rs) => (rs.includes(r) ? rs.filter((x) => x !== r) : [...rs, r]));
  const clear = () => { setRarities([]); setStockF("all"); setOnlyFavs(false); };

  return (
    <section id="catalogo" className="max-w-6xl mx-auto px-4 sm:px-6 py-12 scroll-mt-40">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="pk-eyebrow c-ember">Tienda</div>
          <h2 className="pk-display text-3xl md:text-4xl c-ink">{onlyFavs ? "Tus favoritos" : category === "Todos" ? "Nuevos ingresos" : category}</h2>
          <p className="text-sm c-ink2 font-semibold">
            {list.length} {list.length === 1 ? "producto" : "productos"}
            {query && <> para “<strong className="c-ink">{query}</strong>”</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="pk-btn v-outline s-md lg:hidden">
            <SlidersHorizontal className="w-4 h-4" /> Filtros
          </button>
          <select id="sort" value={sort} onChange={(e) => setSort(e.target.value)} className="pk-input !w-auto font-bold" aria-label="Ordenar">
            <option value="featured">Destacados primero</option>
            <option value="priceAsc">Precio: menor a mayor</option>
            <option value="priceDesc">Precio: mayor a menor</option>
            <option value="name">Nombre A–Z</option>
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        <aside className={`${showFilters ? "block" : "hidden"} lg:block pk-frame p-4 h-fit space-y-5`}>
          <div className="flex items-center justify-between">
            <span className="pk-eyebrow c-ink flex items-center gap-1.5"><SlidersHorizontal className="w-4 h-4" /> Filtros</span>
            <button onClick={clear} className="text-xs font-extrabold c-ember hover:underline">Limpiar</button>
          </div>
          <div>
            <div className="pk-eyebrow c-ink2 mb-2">Categoría</div>
            <div className="flex flex-wrap gap-1.5">
              {["Todos", ...CATEGORIES].map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`pk-tab !text-xs !px-3 !py-1 ${category === c ? "on" : "c-ink border-2 b-line"}`}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="pk-eyebrow c-ink2 mb-2">Rareza</div>
            <ul className="space-y-1.5">
              {RARITIES.map((r) => {
                const n = base.filter((p) => p.rarity === r).length;
                return (
                  <li key={r}>
                    <label className={`flex items-center gap-2 text-sm font-semibold cursor-pointer ${n ? "c-ink" : "c-ink2 opacity-60"}`}>
                      <input type="checkbox" checked={rarities.includes(r)} onChange={() => toggleRarity(r)} />
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: RARITY_COLOR[r] }} />
                      <span className="flex-1">{r}</span>
                      <span className="pk-mono text-xs c-ink2">{n}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <div className="pk-eyebrow c-ink2 mb-2">Estado de stock</div>
            <div className="space-y-1.5">
              {[["all", "Todos"], ["ok", "Disponible"], ["low", "Pocas unidades"], ["out", "Agotado"]].map(([k, l]) => (
                <label key={k} className="flex items-center gap-2 text-sm font-semibold c-ink cursor-pointer">
                  <input type="radio" name="stockF" checked={stockF === k} onChange={() => setStockF(k)} /> {l}
                </label>
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between gap-2 text-sm font-bold c-ink cursor-pointer">
            Solo en stock
            <button
              type="button"
              onClick={() => setStockF(stockF === "all" || stockF === "out" ? "ok" : "all")}
              className={`relative w-11 h-6 rounded-full border-2 b-ink transition ${stockF === "ok" || stockF === "low" ? "bg-ember" : "bg-paper"}`}
              aria-pressed={stockF === "ok" || stockF === "low"}
              aria-label="Solo en stock"
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white border-2 b-ink transition-all ${stockF === "ok" || stockF === "low" ? "left-5" : "left-0.5"}`} />
            </button>
          </label>
        </aside>

        <div className="lg:col-span-3">
          {loading ? (
            <div className="text-center py-16 rounded-3xl border-2 border-dashed b-ink bg-white">
              <span className="inline-block w-8 h-8 rounded-full border-4 b-ink border-t-transparent animate-spin" />
              <p className="mt-3 pk-display c-ink">Cargando catálogo…</p>
            </div>
          ) : list.length === 0 ? (
            <div className="text-center py-16 rounded-3xl border-2 border-dashed b-ink bg-white">
              <Search className="w-8 h-8 mx-auto c-ink2" />
              <p className="mt-2 pk-display c-ink">No encontramos productos con esos filtros</p>
              <p className="text-sm c-ink2">Prueba con otra rareza o limpia la búsqueda.</p>
              <Btn variant="outline" size="sm" className="mt-4" onClick={clear}>Limpiar filtros</Btn>
            </div>
          ) : (
            <div className="pk-grid">
              {list.map((p) => (
                <ProductCard key={p.id} product={p} threshold={threshold} inCart={cart[p.id] || 0} onAdd={onAdd} onView={onView} isFav={favs.includes(p.id)} toggleFav={toggleFav} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ProductModal({ product, onClose, threshold, inCart, onAdd }) {
  const [tab, setTab] = useState("desc");
  if (!product) return null;
  const s = stockStatus(product, threshold);
  const canAdd = s.key !== "out" && product.stock - inCart > 0;
  return (
    <Modal open onClose={onClose} title={product.name} subtitle={product.set} size="max-w-4xl">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="aspect-square rounded-3xl overflow-hidden border-2 b-ink">
          <ProductArt product={product} size="lg" />
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-1.5">
            <RarityBadge rarity={product.rarity} />
            <ConditionBadge condition={product.condition} />
            <span className="pk-badge bg-paper c-ink" style={{ boxShadow: "inset 0 0 0 1.5px var(--line)" }}>{product.category}</span>
          </div>
          <div className="pk-mono text-4xl font-bold c-ink">{fmtPEN(product.price)}</div>
          <StockTag product={product} threshold={threshold} />
          <div className="grid grid-cols-3 gap-2">
            {[[BadgeCheck, "100% original"], [Shield, "Top loader + sleeve"], [Truck, "Envío a todo el Perú"]].map(([I, t]) => (
              <div key={t} className="rounded-2xl bg-pika50 border-2 b-line p-2 text-center">
                <I className="w-5 h-5 mx-auto c-ink" strokeWidth={2.2} />
                <div className="text-xs font-extrabold c-ink mt-1 leading-tight">{t}</div>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            {[["desc", "Descripción"], ["ship", "Envío"]].map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`pk-tab !text-sm ${tab === k ? "on" : "c-ink"}`}>{l}</button>
            ))}
          </div>
          <p className="text-sm c-ink leading-relaxed">
            {tab === "desc"
              ? product.description
              : `Entrega en ${DELIVERY_TIME} a Lima Metropolitana, Callao y provincias (Olva Courier o Shalom). Recojo gratis en ${PICKUP_POINTS.join(" o ")}.`}
          </p>
          <div className="rounded-2xl bg-white border-2 b-line p-3 text-sm c-ink flex gap-2">
            <ShieldCheck className="w-5 h-5 shrink-0 c-ok" />
            <span>Garantía de autenticidad: si el producto no es original, te devolvemos el 100% del pago y el costo de envío.</span>
          </div>
          {inCart > 0 && <p className="text-xs c-ink2 font-semibold">Ya tienes {inCart} en el carrito.</p>}
          <Btn size="lg" className="mt-auto" onClick={() => onAdd(product)} disabled={!canAdd}>
            <ShoppingCart className="w-5 h-5" strokeWidth={2.5} /> {canAdd ? "Agregar al carrito" : s.key === "out" ? "Agotado" : "Alcanzaste el stock disponible"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Comunidad ---------- */

function Community({ notify, onSubscribe }) {
  const [phone, setPhone] = useState("");
  const [subscribed, setSubscribed] = usePersistentState("stockAlerts", false);
  const [err, setErr] = useState("");
  const channels = [
    { Icon: Instagram, name: "Instagram", handle: "@pokealt.pe", meta: "Aperturas, pulls y sorteos", color: "#E1306C", href: "https://instagram.com/" },
    { Icon: Music2, name: "TikTok", handle: "@pokealt", meta: "Box breaks en vivo", color: "#1E1D1A", href: "https://tiktok.com/" },
    { Icon: MessageCircle, name: "WhatsApp", handle: "Alertas de stock", meta: "Aviso de reposiciones y preventas", color: "#1F9D55", href: "https://whatsapp.com/" },
    { Icon: Youtube, name: "YouTube", handle: "PokeAlt TCG", meta: "Reviews de sets y guías de grading", color: "#E5332A", href: "https://youtube.com/" },
  ];
  const submit = async (e) => {
    e.preventDefault();
    if (!phoneValid(phone)) return setErr("Ingresa un celular peruano de 9 dígitos que empiece con 9.");
    setErr("");
    try {
      await onSubscribe(onlyDigits(phone).replace(/^51/, ""));
      setSubscribed(true);
      notify("Listo. Te avisaremos por WhatsApp cuando haya reposiciones.");
    } catch (e2) {
      setErr(e2.message);
    }
  };
  return (
    <section className="halftone-soft border-y-2 b-ink">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid lg:grid-cols-3 gap-8">
        <div>
          <span className="pk-eyebrow c-ember">Comunidad</span>
          <h2 className="pk-display pk-balance text-3xl md:text-4xl c-ink mt-1 leading-tight">Más de 8 000 entrenadores ya abren sobres con nosotros</h2>
          <p className="c-ink2 mt-3 font-semibold">
            Únete a los canales para enterarte primero de preventas, reposiciones y las subastas de los viernes.
          </p>
          <form onSubmit={submit} className="mt-5 pk-frame p-4">
            <div className="flex items-center gap-2 pk-display c-ink"><Bell className="w-5 h-5 c-ember" strokeWidth={2.5} /> Alertas de stock por WhatsApp</div>
            {subscribed ? (
              <p className="mt-2 text-sm font-bold c-ok flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Estás suscrito a las alertas.</p>
            ) : (
              <>
                <div className="mt-3 flex gap-2">
                  <span className="pk-input !w-auto flex items-center pk-mono font-bold bg-paper">+51</span>
                  <input id="alert-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9XX XXX XXX" inputMode="numeric" className="pk-input flex-1 min-w-0" />
                </div>
                {err && <p className="mt-1 text-xs font-bold c-err">{err}</p>}
                <Btn variant="accent" type="submit" className="w-full mt-3"><Bell className="w-4 h-4" /> Activar alertas</Btn>
                <p className="mt-2 text-xs c-ink2">Al suscribirte aceptas recibir mensajes de stock. Puedes darte de baja en cualquier momento.</p>
              </>
            )}
          </form>
        </div>
        <div className="lg:col-span-2 grid sm:grid-cols-2 gap-3 content-start">
          {channels.map(({ Icon, name, handle, meta, color, href }) => (
            <a key={name} href={href} target="_blank" rel="noreferrer" className="pk-card group flex items-center gap-4 p-4">
              <div className="w-12 h-12 rounded-full text-white flex items-center justify-center shrink-0 border-2 b-ink pop-sm" style={{ background: color }}>
                <Icon className="w-6 h-6" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="pk-display c-ink">{name}</div>
                <div className="text-sm font-bold c-ember truncate">{handle}</div>
                <div className="text-xs c-ink2 truncate">{meta}</div>
              </div>
              <ChevronRight className="w-5 h-5 c-ink" strokeWidth={2.5} />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function Footer({ openLegal, openClaims, openCookies }) {
  const linkCls = "text-white/75 hover:text-white hover:underline underline-offset-2 text-left";
  return (
    <footer className="halftone-ink text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <div className="space-y-4">
          <img src={LOGO_FULL} alt="PokeAlt" className="w-36 rounded-3xl border-2 border-white/20" />
          <p className="text-sm text-white/70">Tienda especializada en Pokémon TCG. Producto original, revisado y enviado con cuidado de coleccionista.</p>
        </div>

        <div>
          <h4 className="pk-display c-pika mb-3">Tienda y subastas</h4>
          <ul className="space-y-2 text-sm">
            {CATEGORIES.map((c) => <li key={c}><a href="#catalogo" className={linkCls}>{c}</a></li>)}
            <li><a href="#subasta" className={linkCls}>Subasta de la semana</a></li>
            <li><button onClick={() => openLegal("terms")} className={linkCls}>Reglas de subasta</button></li>
          </ul>
          <h4 className="pk-display c-pika mt-6 mb-3">Cobertura</h4>
          <ul className="space-y-2 text-sm text-white/75">
            <li className="flex gap-2"><Store className="w-4 h-4 shrink-0 mt-0.5 c-pika" /> Recojo en {PICKUP_POINTS.join(" o ")}</li>
            <li className="flex gap-2"><Truck className="w-4 h-4 shrink-0 mt-0.5 c-pika" /> Lima y Callao: entrega en {DELIVERY_TIME}</li>
            <li className="flex gap-2"><Package className="w-4 h-4 shrink-0 mt-0.5 c-pika" /> Provincias en {DELIVERY_TIME} con Olva Courier y Shalom</li>
          </ul>
        </div>

        <div>
          <h4 className="pk-display c-pika mb-3">Ayuda</h4>
          <ul className="space-y-2 text-sm">
            <li><button onClick={() => openLegal("terms")} className={linkCls}>Términos y Condiciones</button></li>
            <li><button onClick={() => openLegal("privacy")} className={linkCls}>Política de Privacidad (Ley N° 29733)</button></li>
            <li><button onClick={() => openLegal("shipping")} className={linkCls}>Envíos, cambios y devoluciones</button></li>
            <li><button onClick={openCookies} className={linkCls}>Configuración de cookies</button></li>
          </ul>
          <button onClick={openClaims} className="mt-5 flex items-center gap-3 rounded-2xl bg-white c-ink p-3 border-2 border-white w-full text-left" style={{ boxShadow: "0 4px 0 var(--pika)" }}>
            <ReclamacionesIcon className="w-11 h-11 shrink-0" />
            <span>
              <span className="block pk-display leading-tight">Libro de Reclamaciones</span>
              <span className="block text-xs c-ink2">Conforme al Código de Protección y Defensa del Consumidor</span>
            </span>
          </button>
        </div>

        <div>
          <h4 className="pk-display c-pika mb-3">Atención al cliente</h4>
          <ul className="space-y-2 text-sm text-white/75">
            <li className="flex gap-2"><Phone className="w-4 h-4 shrink-0 mt-0.5 c-pika" /> WhatsApp <span className="pk-mono select-all text-white">{STORE_INFO.whatsapp}</span></li>
            <li className="flex gap-2"><Mail className="w-4 h-4 shrink-0 mt-0.5 c-pika" /> <span className="select-all text-white">{STORE_INFO.email}</span></li>
            <li className="flex gap-2"><Clock className="w-4 h-4 shrink-0 mt-0.5 c-pika" /> {STORE_INFO.hours}</li>
          </ul>
          <h4 className="pk-display c-pika mt-6 mb-3">Métodos de pago</h4>
          <div className="flex flex-wrap gap-2">
            {["yape", "plin", "visa", "mastercard"].map((k) => <PayLogo key={k} kind={k} />)}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-white/70">
            <Lock className="w-4 h-4 text-green-400" /> Sitio protegido con certificado SSL
          </div>
        </div>
      </div>
      <div className="border-t-2 border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-xs text-white/50">
          <span className="pk-wordmark inv text-2xl">PokeAlt</span>
          <span>© {new Date().getFullYear()} {STORE_INFO.brand}. Pokémon y sus marcas son propiedad de Nintendo, Creatures Inc. y GAME FREAK inc. PokeAlt es un distribuidor independiente.</span>
        </div>
      </div>
    </footer>
  );
}

/* ---------- Carrito ---------- */

function CartDrawer({ open, onClose, cart, products, setQty, remove, subtotal, onCheckout, freeFrom }) {
  if (!open) return null;
  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ p: products.find((x) => x.id === id), qty }))
    .filter((l) => l.p);
  const missing = Math.max(0, freeFrom - subtotal);
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Carrito">
      <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm" onClick={onClose} />
      <aside className="pk-in absolute right-0 top-0 h-full w-full max-w-md bg-paper border-l-2 b-ink flex flex-col">
        <div className="px-5 py-4 halftone border-b-2 b-ink flex items-center justify-between">
          <h2 className="pk-display text-xl c-ink flex items-center gap-2"><ShoppingCart className="w-5 h-5" strokeWidth={2.5} /> Tu carrito</h2>
          <button onClick={onClose} className="pk-btn v-outline s-sm !px-2 w-9" aria-label="Cerrar carrito"><X className="w-4 h-4" strokeWidth={2.5} /></button>
        </div>
        {lines.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Box className="w-12 h-12 c-ink2" />
            <p className="mt-3 font-semibold c-ink">Tu carrito está vacío</p>
            <p className="text-sm c-ink2">Agrega sobres, singles o accesorios desde el catálogo.</p>
            <Btn className="mt-4" onClick={onClose}>Seguir comprando</Btn>
          </div>
        ) : (
          <>
            <div className="px-5 py-3 bg-white border-b-2 b-line text-sm font-semibold c-ink">
              {missing > 0 ? (
                <>Te faltan <strong className="pk-mono">{fmtPEN(missing)}</strong> para delivery gratis en Lima.</>
              ) : (
                <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Tienes delivery gratis en Lima.</span>
              )}
              <div className="mt-2 h-2.5 rounded-full bg-pika100 border-2 b-ink overflow-hidden">
                <div className="h-full bg-ember" style={{ width: `${Math.min(100, (subtotal / freeFrom) * 100)}%` }} />
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto py-1">
              {lines.map(({ p, qty }) => (
                <li key={p.id} className="mx-3 my-2 p-3 flex gap-3 bg-white rounded-2xl border-2 b-line">
                  <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2 b-ink"><ProductArt product={p} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="pk-display text-sm c-ink leading-snug">{p.name}</div>
                    <div className="text-xs c-ink2">{p.condition} · {fmtPEN(p.price)} c/u</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-full border-2 b-ink bg-white">
                        <button onClick={() => setQty(p.id, qty - 1)} className="p-1.5 hover:bg-pika50 rounded-l-full" aria-label="Quitar uno"><Minus className="w-4 h-4" /></button>
                        <span className="w-8 text-center text-sm pk-mono">{qty}</span>
                        <button onClick={() => setQty(p.id, qty + 1)} disabled={qty >= p.stock} className="p-1.5 hover:bg-pika50 rounded-r-full disabled:opacity-30" aria-label="Agregar uno"><Plus className="w-4 h-4" /></button>
                      </div>
                      <span className="pk-mono font-bold text-sm">{fmtPEN(p.price * qty)}</span>
                    </div>
                    {qty >= p.stock && <div className="text-xs font-bold c-ember mt-1">Máximo disponible: {p.stock}</div>}
                  </div>
                  <button onClick={() => remove(p.id)} className="self-start p-1.5 c-ink2 hover:text-orange-600" aria-label={`Eliminar ${p.name}`}><Trash2 className="w-4 h-4" /></button>
                </li>
              ))}
            </ul>
            <div className="border-t-2 b-ink bg-white p-5 space-y-2">
              <div className="flex justify-between text-sm"><span className="c-ink2">Subtotal</span><span className="pk-mono font-semibold">{fmtPEN(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="c-ink2">Envío</span><span className="c-ink2">Se calcula en el checkout</span></div>
              <div className="text-xs c-ink2">Precios incluyen IGV (18%).</div>
              <Btn variant="accent" size="lg" className="w-full mt-2" onClick={onCheckout}>
                <Lock className="w-4 h-4" /> Ir a pagar
              </Btn>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

/* ---------- Checkout ---------- */

function computeShipping(delivery, subtotal, freeFrom) {
  if (delivery.mode === "pickup") return 0;
  if (delivery.mode === "lima") {
    const d = LIMA_DISTRICTS.find(([n]) => n === delivery.district);
    if (!d) return 0;
    return subtotal >= freeFrom ? 0 : d[1];
  }
  if (delivery.mode === "province") return COURIERS[delivery.courier]?.price || 0;
  return 0;
}

function StepPill({ n, label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm pk-mono font-bold border-2 ${done ? "bg-okc text-white b-ink" : active ? "bg-pika c-ink b-ink pop-sm" : "bg-white c-ink2 b-line"}`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : n}
      </span>
      <span className={`text-sm font-semibold hidden sm:inline ${active ? "c-ink" : "c-ink2"}`}>{label}</span>
    </div>
  );
}

function Checkout({ open, onClose, cart, products, subtotal, settings, onPlaced, openLegal, notify, cardPayments = true, profile }) {
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState({ name: "", docType: "DNI", doc: "", email: "", phone: "", receipt: "boleta", ruc: "", businessName: "" });
  const [delivery, setDelivery] = useState({ mode: "lima", district: "Miraflores", address: "", reference: "", point: PICKUP_POINTS[0], courier: "olva", department: "Arequipa", city: "" });
  const [payTab, setPayTab] = useState("yape");
  const [wallet, setWallet] = useState({ payerPhone: "", opCode: "", fileName: "", filePreview: "" });
  const [card, setCard] = useState({ gateway: "Niubiz", number: "", exp: "", cvv: "", holder: "", docType: "DNI", doc: "", installments: "1" });
  const [consent, setConsent] = useState({ terms: false, privacy: false, marketing: false });
  const [errors, setErrors] = useState({});
  const [processing, setProcessing] = useState(false);
  const [placed, setPlaced] = useState(null);
  const orderRef = useRef(newOrderId());

  useEffect(() => {
    if (open) {
      setStep(1);
      setPlaced(null);
      setErrors({});
      orderRef.current = newOrderId();
      if (profile) {
        setCustomer((c) => ({
          ...c,
          name: c.name || profile.fullName || "",
          docType: c.doc ? c.docType : profile.docType || c.docType,
          doc: c.doc || profile.docNumber || "",
          email: c.email || profile.email || "",
          phone: c.phone || profile.phone || "",
        }));
      }
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const shipping = computeShipping(delivery, subtotal, settings.freeShippingFrom);
  const total = subtotal + shipping;
  const lines = Object.entries(cart).map(([id, qty]) => ({ p: products.find((x) => x.id === id), qty })).filter((l) => l.p);

  const validateStep1 = () => {
    const e = {};
    if (customer.name.trim().split(/\s+/).length < 2) e.name = "Escribe nombres y apellidos.";
    const docErr = validateDoc(customer.docType, customer.doc);
    if (docErr) e.doc = docErr;
    if (!emailValid(customer.email)) e.email = "Revisa el correo electrónico.";
    if (!phoneValid(customer.phone)) e.phone = "Celular de 9 dígitos que empiece con 9.";
    if (customer.receipt === "factura") {
      const r = validateDoc("RUC", customer.ruc);
      if (r) e.ruc = r;
      if (!customer.businessName.trim()) e.businessName = "Indica la razón social.";
    }
    setErrors(e);
    return !Object.keys(e).length;
  };
  const validateStep2 = () => {
    const e = {};
    if (delivery.mode === "lima" && delivery.address.trim().length < 6) e.address = "Indica la dirección de entrega.";
    if (delivery.mode === "province") {
      if (delivery.city.trim().length < 3) e.city = "Indica la ciudad o distrito.";
      if (delivery.courier === "olva" && delivery.address.trim().length < 6) e.address = "Indica la dirección de entrega.";
    }
    setErrors(e);
    return !Object.keys(e).length;
  };
  const validatePay = () => {
    const e = {};
    if (payTab === "card") {
      const brand = cardBrand(card.number);
      if (!luhnValid(card.number) || !brand) e.number = "Número de tarjeta inválido.";
      else if (!["visa", "mastercard"].includes(brand)) e.number = "Solo aceptamos tarjetas Visa y Mastercard.";
      const m = card.exp.match(/^(\d{2})\/(\d{2})$/);
      if (!m) e.exp = "Usa el formato MM/AA.";
      else {
        const mm = +m[1];
        const yy = 2000 + +m[2];
        const now = new Date();
        if (mm < 1 || mm > 12) e.exp = "Mes inválido.";
        else if (yy < now.getFullYear() || (yy === now.getFullYear() && mm < now.getMonth() + 1)) e.exp = "La tarjeta está vencida.";
      }
      const cvvLen = 3;
      if (onlyDigits(card.cvv).length !== cvvLen) e.cvv = `El CVV tiene ${cvvLen} dígitos.`;
      if (card.holder.trim().length < 5) e.holder = "Nombre como aparece en la tarjeta.";
      const d = validateDoc(card.docType, card.doc);
      if (d) e.cardDoc = d;
    } else {
      if (!phoneValid(wallet.payerPhone)) e.payerPhone = "Celular desde el que pagaste (9 dígitos).";
      if (!/^\d{6,12}$/.test(onlyDigits(wallet.opCode)) || onlyDigits(wallet.opCode) !== wallet.opCode.trim())
        e.opCode = "El número de operación tiene entre 6 y 12 dígitos.";
    }
    if (!consent.terms) e.terms = "Debes aceptar los Términos y Condiciones.";
    if (!consent.privacy) e.privacy = "Necesitamos tu consentimiento para procesar el pedido.";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const pay = async () => {
    if (payTab === "card" && !cardPayments) return;
    if (!validatePay()) return;
    setProcessing(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      const order = {
        id: orderRef.current,
        createdAt: new Date().toISOString(),
        customer,
        delivery: { ...delivery },
        items: lines.map(({ p, qty }) => ({ id: p.id, name: p.name, price: p.price, qty })),
        subtotal,
        shipping,
        total,
        method: payTab === "card" ? `Tarjeta ${cardBrand(card.number).toUpperCase()} ···· ${onlyDigits(card.number).slice(-4)} (${card.gateway})` : `${payTab === "yape" ? "Yape" : "Plin"} · Op. ${wallet.opCode}`,
        methodKey: payTab,
        status: payTab === "card" ? "Pagado" : "Pendiente de verificación",
        marketing: consent.marketing,
      };
      const saved = await onPlaced(order);
      setPlaced(saved);
    } catch (e) {
      notify(e.message || "No pudimos registrar tu pedido. Intenta de nuevo.", "error");
    } finally {
      setProcessing(false);
    }
  };

  const onFile = (f) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) return notify("El comprobante debe pesar menos de 5 MB.", "error");
    const r = new FileReader();
    r.onload = () => setWallet((w) => ({ ...w, fileName: f.name, filePreview: f.type.startsWith("image/") ? r.result : "" }));
    r.readAsDataURL(f);
  };

  const deliveryLabel = () => {
    if (delivery.mode === "pickup") return delivery.point;
    if (delivery.mode === "lima") return `Delivery · ${delivery.district}`;
    return `${COURIERS[delivery.courier].name} · ${delivery.city || "—"}, ${delivery.department}`;
  };

  if (!open) return null;

  if (placed) {
    return (
      <Modal open onClose={onClose} title="¡Pedido registrado!" subtitle={`Pedido ${placed.id}`} icon={CheckCircle2} size="max-w-lg">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-pika border-2 b-ink pop c-ink flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <p className="c-ink">
            {placed.status === "Pagado"
              ? "Tu pago con tarjeta fue aprobado. Te enviamos la confirmación y el comprobante electrónico a tu correo."
              : "Recibimos tu constancia. Verificaremos el pago en máximo 2 horas hábiles y te confirmaremos por WhatsApp."}
          </p>
          <div className="rounded-2xl bg-paper border-2 b-line p-4 text-left text-sm space-y-1">
            <div className="flex justify-between"><span className="c-ink2">Estado</span><strong>{placed.status}</strong></div>
            <div className="flex justify-between"><span className="c-ink2">Pago</span><span className="text-right">{placed.method}</span></div>
            <div className="flex justify-between"><span className="c-ink2">Entrega</span><span className="text-right">{deliveryLabel()}</span></div>
            <div className="flex justify-between pt-2 border-t b-line"><span className="font-semibold">Total</span><span className="pk-mono font-bold">{fmtPEN(placed.total)}</span></div>
          </div>
          <Btn className="w-full" onClick={onClose}>Volver a la tienda</Btn>
        </div>
      </Modal>
    );
  }

  const radio = (active) => `flex-1 min-w-0 text-left rounded-2xl p-3 bg-white ring-2 transition ${active ? "pk-sel" : "pk-unsel hover:ring-stone-400"}`;

  return (
    <Modal open onClose={onClose} title="Checkout seguro" subtitle="Tus datos viajan cifrados (SSL/TLS)" icon={Lock} size="max-w-5xl">
      <div className="flex items-center gap-3 sm:gap-6 mb-6">
        <StepPill n={1} label="Tus datos" active={step === 1} done={step > 1} />
        <div className="flex-1 h-px bg-paper" />
        <StepPill n={2} label="Entrega" active={step === 2} done={step > 2} />
        <div className="flex-1 h-px bg-paper" />
        <StepPill n={3} label="Pago" active={step === 3} done={false} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {step === 1 && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Nombres y apellidos" error={errors.name} className="sm:col-span-2">
                <input id="c-name" className={inputCls(errors.name)} value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Ej. Ana Quispe Rojas" />
              </Field>
              <Field label="Documento" error={errors.doc}>
                <div className="flex gap-2">
                  <select id="c-doctype" className={`${inputCls()} w-24`} value={customer.docType} onChange={(e) => setCustomer({ ...customer, docType: e.target.value })}>
                    <option>DNI</option><option>CE</option>
                  </select>
                  <input id="c-doc" className={inputCls(errors.doc)} value={customer.doc} onChange={(e) => setCustomer({ ...customer, doc: e.target.value })} placeholder={customer.docType === "DNI" ? "8 dígitos" : "N° de carné"} inputMode={customer.docType === "DNI" ? "numeric" : "text"} />
                </div>
              </Field>
              <Field label="Celular" error={errors.phone}>
                <input id="c-phone" className={inputCls(errors.phone)} value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="9XX XXX XXX" inputMode="tel" />
              </Field>
              <Field label="Correo electrónico" error={errors.email} className="sm:col-span-2" hint="Aquí te enviaremos la confirmación y el comprobante electrónico.">
                <input id="c-email" className={inputCls(errors.email)} value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="tu@correo.com" inputMode="email" />
              </Field>
              <div className="sm:col-span-2">
                <span className="block text-xs font-semibold uppercase tracking-wide c-ink2 mb-1">Comprobante</span>
                <div className="flex gap-3">
                  {[["boleta", "Boleta electrónica"], ["factura", "Factura electrónica"]].map(([k, l]) => (
                    <button key={k} type="button" onClick={() => setCustomer({ ...customer, receipt: k })} className={radio(customer.receipt === k)}>
                      <span className="font-semibold text-sm">{l}</span>
                    </button>
                  ))}
                </div>
              </div>
              {customer.receipt === "factura" && (
                <>
                  <Field label="RUC" error={errors.ruc}>
                    <input id="c-ruc" className={inputCls(errors.ruc)} value={customer.ruc} onChange={(e) => setCustomer({ ...customer, ruc: e.target.value })} placeholder="11 dígitos" inputMode="numeric" />
                  </Field>
                  <Field label="Razón social" error={errors.businessName}>
                    <input id="c-bizname" className={inputCls(errors.businessName)} value={customer.businessName} onChange={(e) => setCustomer({ ...customer, businessName: e.target.value })} />
                  </Field>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                {[
                  ["pickup", Store, "Recojo", "Fullmarket o C.C. Arenales · Gratis"],
                  ["lima", Truck, "Delivery Lima", "Lima Metropolitana y Callao"],
                  ["province", Package, "Provincias", "Olva Courier o Shalom"],
                ].map(([k, Icon, t, d]) => (
                  <button key={k} type="button" onClick={() => setDelivery({ ...delivery, mode: k })} className={radio(delivery.mode === k)}>
                    <Icon className="w-5 h-5 c-ember" />
                    <div className="font-semibold text-sm mt-1">{t}</div>
                    <div className="text-xs c-ink2">{d}</div>
                  </button>
                ))}
              </div>

              {delivery.mode === "pickup" && (
                <Field label="Punto de recojo" hint="Coordinamos día y hora por WhatsApp. Lleva tu DNI y el número de pedido.">
                  <select id="d-point" className={inputCls()} value={delivery.point} onChange={(e) => setDelivery({ ...delivery, point: e.target.value })}>
                    {PICKUP_POINTS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </Field>
              )}

              {delivery.mode === "lima" && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Distrito" hint={subtotal >= settings.freeShippingFrom ? "Tu pedido tiene delivery gratis." : `Entrega en ${DELIVERY_TIME}.`}>
                    <select id="d-district" className={inputCls()} value={delivery.district} onChange={(e) => setDelivery({ ...delivery, district: e.target.value })}>
                      {LIMA_DISTRICTS.map(([n, c]) => <option key={n} value={n}>{n} · {fmtPEN(c)}</option>)}
                    </select>
                  </Field>
                  <Field label="Dirección" error={errors.address}>
                    <input id="d-address" className={inputCls(errors.address)} value={delivery.address} onChange={(e) => setDelivery({ ...delivery, address: e.target.value })} placeholder="Av./Jr./Calle, número, dpto." />
                  </Field>
                  <Field label="Referencia" className="sm:col-span-2">
                    <input id="d-ref" className={inputCls()} value={delivery.reference} onChange={(e) => setDelivery({ ...delivery, reference: e.target.value })} placeholder="Frente al parque, portón negro…" />
                  </Field>
                </div>
              )}

              {delivery.mode === "province" && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3">
                    {Object.entries(COURIERS).map(([k, c]) => (
                      <button key={k} type="button" onClick={() => setDelivery({ ...delivery, courier: k })} className={radio(delivery.courier === k)}>
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-sm">{c.name}</span>
                          <span className="pk-mono text-sm font-bold">{fmtPEN(c.price)}</span>
                        </div>
                        <div className="text-xs c-ink2">{c.detail} · {c.eta}</div>
                      </button>
                    ))}
                  </div>
                  <Field label="Departamento">
                    <select id="d-dept" className={inputCls()} value={delivery.department} onChange={(e) => setDelivery({ ...delivery, department: e.target.value })}>
                      {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </Field>
                  <Field label="Provincia / distrito" error={errors.city}>
                    <input id="d-city" className={inputCls(errors.city)} value={delivery.city} onChange={(e) => setDelivery({ ...delivery, city: e.target.value })} placeholder="Ej. Cayma" />
                  </Field>
                  <Field
                    label={delivery.courier === "olva" ? "Dirección" : "Agencia Shalom de preferencia (opcional)"}
                    error={errors.address}
                    className="sm:col-span-2"
                  >
                    <input id="d-prov-address" className={inputCls(errors.address)} value={delivery.address} onChange={(e) => setDelivery({ ...delivery, address: e.target.value })} />
                  </Field>
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex rounded-full bg-white border-2 b-ink p-1 gap-1">
                {[["yape", "Yape"], ["plin", "Plin"], ["card", "Tarjeta"]].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => { setPayTab(k); setErrors({}); }} className={`pk-tab flex-1 flex items-center justify-center gap-2 ${payTab === k ? "on" : "c-ink"}`}>
                    {k === "card" ? <CreditCard className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />} {l}
                  </button>
                ))}
              </div>

              {payTab !== "card" ? (
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="rounded-3xl p-4 text-white border-2 b-ink pop" style={{ background: payTab === "yape" ? "#742284" : "#00A99D" }}>
                    <div className="flex items-center justify-between">
                      <PayLogo kind={payTab} />
                      <span className="text-xs opacity-80">Pedido {orderRef.current}</span>
                    </div>
                    <div className="mt-3 bg-white rounded-2xl border-2 b-ink p-3 w-full max-w-xs mx-auto aspect-square">
                      <FakeQR
                        seed={`${payTab}|${payTab === "yape" ? settings.yapeNumber : settings.plinNumber}|${total}|${orderRef.current}`}
                        color={payTab === "yape" ? "#4c1d95" : "#0f766e"}
                        badge={payTab === "yape" ? "yape" : "plin"}
                        badgeColor={payTab === "yape" ? "#7e22ce" : "#14b8a6"}
                      />
                    </div>
                    <div className="mt-3 text-center">
                      <div className="text-xs opacity-80">Monto exacto a pagar</div>
                      <div className="pk-mono text-2xl font-bold">{fmtPEN(total)}</div>
                      <div className="mt-2 text-sm">
                        o al celular <strong className="pk-mono select-all">{payTab === "yape" ? settings.yapeNumber : settings.plinNumber}</strong>
                        <button type="button" onClick={() => copyText(onlyDigits(payTab === "yape" ? settings.yapeNumber : settings.plinNumber), (ok) => notify(ok ? "Número copiado." : "Selecciona el número para copiarlo."))} className="ml-2 inline-flex items-center gap-1 text-xs underline"><Copy className="w-3 h-3" /> Copiar</button>
                      </div>
                      <div className="text-xs opacity-80">Titular: {settings.walletHolder}</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <ol className="text-sm c-ink space-y-2">
                      {[
                        `Abre ${payTab === "yape" ? "Yape" : "Plin o la app de tu banco"} y escanea el QR, o paga al número indicado.`,
                        `Ingresa el monto exacto: ${fmtPEN(total)}.`,
                        `En el mensaje escribe tu código de pedido: ${orderRef.current}.`,
                        "Copia el número de operación y adjunta la captura de la constancia.",
                      ].map((t, i) => (
                        <li key={i} className="flex gap-2"><span className="w-6 h-6 rounded-full bg-pika border-2 b-ink c-ink text-xs pk-mono font-bold flex items-center justify-center shrink-0">{i + 1}</span>{t}</li>
                      ))}
                    </ol>
                    <Field label="Celular desde el que pagaste" error={errors.payerPhone}>
                      <input id="w-phone" className={inputCls(errors.payerPhone)} value={wallet.payerPhone} onChange={(e) => setWallet({ ...wallet, payerPhone: e.target.value })} placeholder="9XX XXX XXX" inputMode="tel" />
                    </Field>
                    <Field label="Número de operación" error={errors.opCode}>
                      <input id="w-op" className={`${inputCls(errors.opCode)} pk-mono`} value={wallet.opCode} onChange={(e) => setWallet({ ...wallet, opCode: e.target.value })} placeholder="Ej. 04512873" inputMode="numeric" />
                    </Field>
                    <Field label="Constancia de pago (opcional)" hint="JPG, PNG o PDF de hasta 5 MB.">
                      <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed b-ink bg-white p-3">
                        {wallet.filePreview ? (
                          <img src={wallet.filePreview} alt="Constancia" className="w-12 h-12 rounded object-cover" />
                        ) : (
                          <Upload className="w-6 h-6 c-ink2" />
                        )}
                        <span className="text-sm c-ink2 truncate flex-1">{wallet.fileName || "Selecciona un archivo"}</span>
                        <input id="w-file" type="file" accept="image/*,application/pdf" onChange={(e) => onFile(e.target.files?.[0])} className="text-xs w-28" />
                      </div>
                    </Field>
                  </div>
                </div>
              ) : !cardPayments ? (
                <div className="rounded-2xl border-2 b-ink bg-pika50 p-5 flex gap-3 items-start">
                  <CreditCard className="w-6 h-6 shrink-0 c-ink" />
                  <div>
                    <div className="pk-display c-ink">El pago con tarjeta llega muy pronto</div>
                    <p className="text-sm c-ink2 mt-1">Estamos activando Visa y Mastercard. Por ahora puedes pagar con Yape o Plin.</p>
                    <Btn size="sm" className="mt-3" onClick={() => setPayTab("yape")}><Smartphone className="w-4 h-4" /> Pagar con Yape</Btn>
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-5 gap-5">
                  <div className="md:col-span-2">
                    <div className="rounded-2xl bg-ink c-pika border-2 b-ink pop p-4 aspect-video flex flex-col justify-between halftone-ink">
                      <div className="flex justify-between items-start">
                        <div className="w-10 h-7 rounded bg-pika" />
                        {cardBrand(card.number) && <PayLogo kind={cardBrand(card.number)} />}
                      </div>
                      <div className="pk-mono text-lg tracking-wider">{card.number || "•••• •••• •••• ••••"}</div>
                      <div className="flex justify-between text-xs uppercase">
                        <span className="truncate">{card.holder || "Nombre del titular"}</span>
                        <span className="pk-mono">{card.exp || "MM/AA"}</span>
                      </div>
                    </div>
                    <div className="mt-3">
                      <span className="block text-xs font-semibold uppercase tracking-wide c-ink2 mb-1">Procesador (simulado)</span>
                      <div className="flex gap-2">
                        {["Niubiz", "Culqi", "Mercado Pago"].map((g) => (
                          <button key={g} type="button" onClick={() => setCard({ ...card, gateway: g })} className={`pk-tab flex-1 !text-xs !px-2 ${card.gateway === g ? "on" : "c-ink border-2 b-line"}`}>{g}</button>
                        ))}
                      </div>
                    </div>
                    <p className="mt-3 text-xs c-ink2 flex gap-1.5"><Info className="w-4 h-4 shrink-0" /> Prueba con 4111 1111 1111 1111, cualquier fecha futura y CVV 123.</p>
                  </div>
                  <div className="md:col-span-3 grid grid-cols-2 gap-3">
                    <Field label="Número de tarjeta" error={errors.number} className="col-span-2">
                      <input id="k-number" className={`${inputCls(errors.number)} pk-mono`} value={card.number} onChange={(e) => setCard({ ...card, number: formatCardNumber(e.target.value) })} placeholder="0000 0000 0000 0000" inputMode="numeric" autoComplete="cc-number" />
                    </Field>
                    <Field label="Vencimiento" error={errors.exp}>
                      <input
                        id="k-exp"
                        className={`${inputCls(errors.exp)} pk-mono`}
                        value={card.exp}
                        onChange={(e) => {
                          const d = onlyDigits(e.target.value).slice(0, 4);
                          setCard({ ...card, exp: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d });
                        }}
                        placeholder="MM/AA"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                      />
                    </Field>
                    <Field label="CVV" error={errors.cvv}>
                      <input id="k-cvv" type="password" className={`${inputCls(errors.cvv)} pk-mono`} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: onlyDigits(e.target.value).slice(0, 4) })} placeholder="•••" inputMode="numeric" autoComplete="cc-csc" />
                    </Field>
                    <Field label="Titular de la tarjeta" error={errors.holder} className="col-span-2">
                      <input id="k-holder" className={inputCls(errors.holder)} value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value.toUpperCase() })} placeholder="COMO APARECE EN LA TARJETA" autoComplete="cc-name" />
                    </Field>
                    <Field label="Documento del titular" error={errors.cardDoc} className="col-span-2">
                      <div className="flex gap-2">
                        <select id="k-doctype" className={`${inputCls()} w-24`} value={card.docType} onChange={(e) => setCard({ ...card, docType: e.target.value })}>
                          <option>DNI</option><option>CE</option><option>RUC</option>
                        </select>
                        <input id="k-doc" className={inputCls(errors.cardDoc)} value={card.doc} onChange={(e) => setCard({ ...card, doc: e.target.value })} inputMode="numeric" />
                      </div>
                    </Field>
                    <Field label="Cuotas" className="col-span-2" hint="Las cuotas sin intereses dependen de tu banco emisor.">
                      <select id="k-inst" className={inputCls()} value={card.installments} onChange={(e) => setCard({ ...card, installments: e.target.value })}>
                        {["1", "2", "3", "6", "12"].map((n) => <option key={n} value={n}>{n === "1" ? "Pago único" : `${n} cuotas`}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-pika50 border-2 b-line p-4 space-y-2 text-sm">
                <label className="flex gap-2 items-start">
                  <input id="cs-terms" type="checkbox" className="mt-1" checked={consent.terms} onChange={(e) => setConsent({ ...consent, terms: e.target.checked })} />
                  <span>He leído y acepto los <button type="button" className="underline c-ember" onClick={() => openLegal("terms")}>Términos y Condiciones</button> y la <button type="button" className="underline c-ember" onClick={() => openLegal("shipping")}>política de envíos y devoluciones</button>.</span>
                </label>
                {errors.terms && <p className="text-xs font-bold c-err ml-6">{errors.terms}</p>}
                <label className="flex gap-2 items-start">
                  <input id="cs-privacy" type="checkbox" className="mt-1" checked={consent.privacy} onChange={(e) => setConsent({ ...consent, privacy: e.target.checked })} />
                  <span>Autorizo a {STORE_INFO.brand} a tratar mis datos personales para gestionar mi compra, entrega, facturación y atención posventa, conforme a la <button type="button" className="underline c-ember" onClick={() => openLegal("privacy")}>Política de Privacidad</button> y la Ley N° 29733.</span>
                </label>
                {errors.privacy && <p className="text-xs font-bold c-err ml-6">{errors.privacy}</p>}
                <label className="flex gap-2 items-start c-ink2">
                  <input id="cs-mkt" type="checkbox" className="mt-1" checked={consent.marketing} onChange={(e) => setConsent({ ...consent, marketing: e.target.checked })} />
                  <span>(Opcional) Acepto recibir novedades, preventas y promociones por correo o WhatsApp.</span>
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-between gap-3 pt-2">
            {step > 1 ? (
              <Btn variant="outline" onClick={() => { setErrors({}); setStep(step - 1); }}><ChevronLeft className="w-4 h-4" /> Atrás</Btn>
            ) : <span />}
            {step < 3 ? (
              <Btn onClick={next}>Continuar <ChevronRight className="w-4 h-4" /></Btn>
            ) : (
              <Btn variant="accent" onClick={pay} disabled={processing || (payTab === "card" && !cardPayments)} className="px-6">
                {processing ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Procesando…</>
                ) : payTab === "card" ? (
                  <><Lock className="w-4 h-4" /> Pagar {fmtPEN(total)}</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Enviar constancia</>
                )}
              </Btn>
            )}
          </div>
        </div>

        <aside className="pk-frame p-4 h-fit space-y-3">
          <h3 className="pk-display font-bold">Resumen del pedido</h3>
          <ul className="space-y-2 max-h-56 overflow-y-auto">
            {lines.map(({ p, qty }) => (
              <li key={p.id} className="flex gap-2 text-sm">
                <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border-2 b-ink"><ProductArt product={p} /></div>
                <div className="flex-1 min-w-0"><div className="truncate">{p.name}</div><div className="text-xs c-ink2">x{qty}</div></div>
                <span className="pk-mono">{fmtPEN(p.price * qty)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t b-line pt-3 space-y-1 text-sm">
            <div className="flex justify-between"><span className="c-ink2">Subtotal</span><span className="pk-mono">{fmtPEN(subtotal)}</span></div>
            <div className="flex justify-between"><span className="c-ink2">Envío</span><span className="pk-mono">{shipping ? fmtPEN(shipping) : "Gratis"}</span></div>
            <div className="text-xs c-ink2">{deliveryLabel()}</div>
            <div className="flex justify-between text-base pt-2 border-t b-line"><span className="font-bold">Total</span><span className="pk-mono font-bold">{fmtPEN(total)}</span></div>
            <div className="text-xs c-ink2">Incluye IGV · Moneda: Soles (PEN)</div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="flex items-center gap-1.5 text-xs c-ink2"><Lock className="w-4 h-4 c-ok" /> SSL 256 bits</div>
            <div className="flex items-center gap-1.5 text-xs c-ink2"><ShieldCheck className="w-4 h-4 c-ok" /> Pago cifrado</div>
            <div className="flex items-center gap-1.5 text-xs c-ink2"><BadgeCheck className="w-4 h-4 c-ok" /> 100% original</div>
            <div className="flex items-center gap-1.5 text-xs c-ink2"><Shield className="w-4 h-4 c-ok" /> PCI DSS vía pasarela</div>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

/* ---------- Libro de Reclamaciones ---------- */

function ComplaintsBook({ open, onClose, products, claimSeq, onSubmit }) {
  const empty = {
    docType: "DNI", doc: "", names: "", lastNames: "", address: "", phone: "", email: "", isMinor: false, guardian: "",
    goodType: "producto", goodDesc: "", amount: "", orderId: "",
    kind: "reclamo", detail: "", request: "", accept: false,
  };
  const [f, setF] = useState(empty);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(null);
  const [sending, setSending] = useState(false);
  const year = new Date().getFullYear();
  const number = claimSeq ? `${String(claimSeq).padStart(6, "0")}-${year}` : "Se asigna al enviar";
  const today = new Date();

  useEffect(() => {
    if (open) {
      setDone(null);
      setErrors({});
    }
  }, [open]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    const d = validateDoc(f.docType, f.doc);
    if (d) er.doc = d;
    if (!f.names.trim()) er.names = "Obligatorio.";
    if (!f.lastNames.trim()) er.lastNames = "Obligatorio.";
    if (f.address.trim().length < 6) er.address = "Indica tu domicilio.";
    if (!phoneValid(f.phone) && onlyDigits(f.phone).length < 7) er.phone = "Teléfono inválido.";
    if (!emailValid(f.email)) er.email = "Correo inválido.";
    if (f.isMinor && !f.guardian.trim()) er.guardian = "Indica el nombre del padre, madre o apoderado.";
    if (f.goodDesc.trim().length < 3) er.goodDesc = "Describe el producto o servicio.";
    if (f.detail.trim().length < 20) er.detail = "Detalla lo ocurrido (mínimo 20 caracteres).";
    if (f.request.trim().length < 5) er.request = "Indica qué solicitas.";
    if (!f.accept) er.accept = "Debes confirmar la veracidad de la información.";
    setErrors(er);
    if (Object.keys(er).length) return;
    const claim = {
      number,
      createdAt: today.toISOString(),
      dueAt: addBusinessDays(today, 15).toISOString(),
      status: "Pendiente",
      ...f,
    };
    setSending(true);
    try {
      const saved = await onSubmit(claim);
      setDone(saved);
      setF(empty);
    } catch (e2) {
      setErrors({ form: e2.message || "No pudimos registrar la hoja. Intenta de nuevo." });
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  if (done) {
    return (
      <Modal open onClose={onClose} title="Hoja de reclamación registrada" icon={BookOpen} size="max-w-lg">
        <div className="space-y-4 text-sm">
          <div className="rounded-xl bg-ink text-white p-4 text-center">
            <div className="text-xs uppercase tracking-wider text-white/70">Hoja de Reclamación N°</div>
            <div className="pk-mono text-2xl font-bold c-pika">{done.number}</div>
            <div className="text-xs text-white/70 mt-1">Registrada el {fmtDate(done.createdAt)} · {done.kind === "reclamo" ? "Reclamo" : "Queja"}</div>
          </div>
          <p className="c-ink">
            Enviamos una copia de tu hoja a <strong>{done.email}</strong>. Te responderemos en un plazo máximo de <strong>15 días hábiles</strong>, a más tardar el <strong>{fmtDate(done.dueAt)}</strong>.
          </p>
          <p className="text-xs c-ink2">
            La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.
          </p>
          <Btn className="w-full" onClick={onClose}>Entendido</Btn>
        </div>
      </Modal>
    );
  }

  const section = (n, t) => (
    <div className="flex items-center gap-2 mt-2">
      <span className="w-6 h-6 rounded bg-ink c-pika text-xs font-bold flex items-center justify-center">{n}</span>
      <h3 className="pk-display font-bold c-ink">{t}</h3>
    </div>
  );

  return (
    <Modal open onClose={onClose} title="Libro de Reclamaciones Virtual" subtitle="Conforme a la Ley N° 29571 y su reglamento" icon={BookOpen} size="max-w-3xl">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid sm:grid-cols-3 gap-3 rounded-2xl bg-pika50 border-2 b-ink p-3 text-sm">
          <div><div className="text-xs c-ink2">Hoja N°</div><div className="pk-mono font-bold">{number}</div></div>
          <div><div className="text-xs c-ink2">Fecha</div><div className="font-semibold">{fmtDate(today)}</div></div>
          <div><div className="text-xs c-ink2">Proveedor</div><div className="font-semibold">{STORE_INFO.brand}</div></div>
        </div>

        {section(1, "Identificación del consumidor reclamante")}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Documento" error={errors.doc}>
            <div className="flex gap-2">
              <select id="lr-doctype" className={`${inputCls()} w-24`} value={f.docType} onChange={set("docType")}><option>DNI</option><option>CE</option></select>
              <input id="lr-doc" className={inputCls(errors.doc)} value={f.doc} onChange={set("doc")} />
            </div>
          </Field>
          <Field label="Teléfono" error={errors.phone}><input id="lr-phone" className={inputCls(errors.phone)} value={f.phone} onChange={set("phone")} inputMode="tel" /></Field>
          <Field label="Nombres" error={errors.names}><input id="lr-names" className={inputCls(errors.names)} value={f.names} onChange={set("names")} /></Field>
          <Field label="Apellidos" error={errors.lastNames}><input id="lr-last" className={inputCls(errors.lastNames)} value={f.lastNames} onChange={set("lastNames")} /></Field>
          <Field label="Domicilio" error={errors.address} className="sm:col-span-2"><input id="lr-address" className={inputCls(errors.address)} value={f.address} onChange={set("address")} /></Field>
          <Field label="Correo electrónico" error={errors.email} className="sm:col-span-2"><input id="lr-email" className={inputCls(errors.email)} value={f.email} onChange={set("email")} inputMode="email" /></Field>
          <label className="sm:col-span-2 flex items-center gap-2 text-sm"><input id="lr-minor" type="checkbox" checked={f.isMinor} onChange={set("isMinor")} /> Soy menor de edad</label>
          {f.isMinor && (
            <Field label="Padre, madre o apoderado" error={errors.guardian} className="sm:col-span-2"><input id="lr-guardian" className={inputCls(errors.guardian)} value={f.guardian} onChange={set("guardian")} /></Field>
          )}
        </div>

        {section(2, "Identificación del bien contratado")}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 flex gap-3">
            {[["producto", "Producto"], ["servicio", "Servicio"]].map(([k, l]) => (
              <label key={k} className={`flex-1 flex items-center gap-2 rounded-2xl bg-white ring-2 p-2.5 text-sm font-bold cursor-pointer ${f.goodType === k ? "pk-sel" : "pk-unsel"}`}>
                <input type="radio" name="goodType" value={k} checked={f.goodType === k} onChange={set("goodType")} /> {l}
              </label>
            ))}
          </div>
          <Field label="Descripción" error={errors.goodDesc} className="sm:col-span-2">
            <input id="lr-good" list="lr-products" className={inputCls(errors.goodDesc)} value={f.goodDesc} onChange={set("goodDesc")} placeholder="Ej. Charizard ex 199/165 / servicio de envío" />
            <datalist id="lr-products">{products.map((p) => <option key={p.id} value={p.name} />)}</datalist>
          </Field>
          <Field label="Monto reclamado (S/)"><input id="lr-amount" type="number" min="0" step="0.01" className={`${inputCls()} pk-mono`} value={f.amount} onChange={set("amount")} /></Field>
          <Field label="N° de pedido (si aplica)"><input id="lr-order" className={`${inputCls()} pk-mono`} value={f.orderId} onChange={set("orderId")} placeholder="PKA-XXXXXX" /></Field>
        </div>

        {section(3, "Detalle de la reclamación y pedido del consumidor")}
        <div className="grid sm:grid-cols-2 gap-3">
          {[
            ["reclamo", "Reclamo", "Disconformidad relacionada con el producto o servicio adquirido. Ej.: la carta llegó en un estado distinto al publicado."],
            ["queja", "Queja", "Disconformidad no relacionada con el producto o servicio, o malestar por la atención recibida. Ej.: demora en responder por WhatsApp."],
          ].map(([k, l, d]) => (
            <label key={k} className={`rounded-xl ring-2 p-3 cursor-pointer ${f.kind === k ? "pk-sel" : "pk-unsel"}`}>
              <span className="flex items-center gap-2 font-bold text-sm"><input type="radio" name="kind" value={k} checked={f.kind === k} onChange={set("kind")} /> {l}</span>
              <span className="block text-xs c-ink2 mt-1">{d}</span>
            </label>
          ))}
        </div>
        <Field label="Detalle" error={errors.detail}><textarea id="lr-detail" rows={4} className={inputCls(errors.detail)} value={f.detail} onChange={set("detail")} /></Field>
        <Field label="Pedido del consumidor" error={errors.request}><textarea id="lr-request" rows={2} className={inputCls(errors.request)} value={f.request} onChange={set("request")} placeholder="Ej. Cambio del producto o devolución del importe" /></Field>

        {section(4, "Observaciones y acciones adoptadas por el proveedor")}
        <p className="text-sm c-ink2 rounded-2xl bg-paper border-2 border-dashed b-line p-3">Este espacio lo completa {STORE_INFO.brand} al responder tu reclamo en un plazo no mayor a 15 días hábiles.</p>

        <label className="flex gap-2 items-start text-sm">
          <input id="lr-accept" type="checkbox" className="mt-1" checked={f.accept} onChange={set("accept")} />
          <span>Declaro que la información es verdadera y autorizo el tratamiento de mis datos para atender esta hoja de reclamación, conforme a la Ley N° 29733.</span>
        </label>
        {errors.accept && <p className="text-xs font-bold c-err">{errors.accept}</p>}
        <p className="text-xs c-ink2">
          La formulación del reclamo no impide acudir a otras vías de solución de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI. El proveedor debe dar respuesta en un plazo no mayor a quince (15) días hábiles.
        </p>
        {errors.form && <p className="text-sm font-bold c-err">{errors.form}</p>}
        <Btn type="submit" size="lg" className="w-full" disabled={sending}><FileText className="w-4 h-4" /> {sending ? "Registrando…" : "Registrar hoja de reclamación"}</Btn>
      </form>
    </Modal>
  );
}

/* ---------- Textos legales ---------- */

const LEGAL = {
  terms: {
    title: "Términos y Condiciones Comerciales",
    sections: [
      ["1. Identificación del proveedor", `${STORE_INFO.brand} opera esta tienda virtual. Puedes contactarnos por WhatsApp al ${STORE_INFO.whatsapp} o al correo ${STORE_INFO.email}. Al comprar aceptas estos términos, que se rigen por el Código de Protección y Defensa del Consumidor (Ley N° 29571) y demás normas peruanas.`],
      ["2. Productos y garantía de autenticidad", "Todos los productos son originales de Pokémon TCG, adquiridos a distribuidores oficiales o a coleccionistas verificados. Si se comprueba que un producto no es auténtico, devolvemos el 100% del importe pagado y el costo de envío. Las imágenes generadas son referenciales; en singles de alto valor enviamos fotos o video reales antes del despacho a pedido del cliente."],
      ["3. Estado de las cartas (grading interno)", "Near Mint (NM): sin desgaste visible o mínimo. Lightly Played (LP): desgaste leve en bordes o esquinas. Moderately Played (MP): desgaste visible, sin dobleces. Heavily Played (HP): desgaste notorio o marcas. Las cartas graduadas por terceros (PSA, BGS, CGC) mantienen la calificación de su certificado. El producto sellado se entrega con su film original de fábrica."],
      ["4. Precios y pagos", "Los precios están expresados en Soles (PEN) e incluyen IGV. Aceptamos Yape, Plin y tarjetas de débito o crédito Visa y Mastercard mediante pasarelas certificadas PCI DSS. Los pagos por Yape o Plin se verifican en un máximo de 2 horas hábiles; el pedido se reserva por 2 horas desde su registro."],
      ["5. Preventas", "El producto en preventa se paga al 100% y se entrega en la fecha de lanzamiento oficial en Perú. Si la distribución oficial se retrasa más de 30 días calendario o se cancela, puedes solicitar la devolución total del importe."],
      ["6. Tiempos de entrega", `Todas las entregas se realizan en un plazo de ${DELIVERY_TIME} desde la confirmación del pago: delivery en Lima Metropolitana y Callao, envíos a provincias vía Olva Courier (domicilio) o Shalom (recojo en agencia), y recojo en ${PICKUP_POINTS.join(" o ")} previa coordinación por WhatsApp.`],
      ["7. Cancelaciones", "Puedes cancelar tu pedido sin costo mientras no haya sido despachado, escribiendo a nuestros canales de atención. Una vez despachado, aplica la política de cambios y devoluciones."],
      ["8. Subastas", "Las pujas son vinculantes. El ganador tiene 24 horas para pagar; de lo contrario, el lote se ofrece al siguiente postor. PokeAlt puede anular pujas fraudulentas."],
      ["9. Libro de Reclamaciones", "Ponemos a tu disposición un Libro de Reclamaciones Virtual. Atendemos reclamos y quejas en un plazo máximo de 15 días hábiles."],
    ],
  },
  privacy: {
    title: "Política de Privacidad y Protección de Datos Personales",
    sections: [
      ["1. Titular del banco de datos", `${STORE_INFO.brand} es el titular del banco de datos personales "Clientes", inscrito ante la Autoridad Nacional de Protección de Datos Personales, conforme a la Ley N° 29733, Ley de Protección de Datos Personales, y su Reglamento.`],
      ["2. Datos que recopilamos", "Nombres y apellidos, DNI, CE o RUC, correo electrónico, celular, dirección de entrega e historial de compras. No almacenamos datos completos de tarjetas: la pasarela de pagos los procesa bajo estándares PCI DSS."],
      ["3. Finalidades del tratamiento", "a) Gestionar tu compra, pago, facturación electrónica y entrega. b) Atender consultas, reclamos y garantías. c) Cumplir obligaciones legales y tributarias. Finalidad adicional, solo con tu consentimiento expreso y revocable: enviarte novedades, preventas y promociones."],
      ["4. Consentimiento", "Al marcar la casilla de autorización en el checkout otorgas tu consentimiento libre, previo, expreso, informado e inequívoco para las finalidades a), b) y c). El consentimiento para fines comerciales es opcional y no condiciona la compra."],
      ["5. Destinatarios y transferencias", "Compartimos los datos estrictamente necesarios con couriers (Olva Courier, Shalom), pasarelas de pago (Niubiz, Culqi, Mercado Pago) y proveedores de facturación electrónica y hosting, quienes actúan como encargados de tratamiento. Si algún proveedor se ubica fuera del Perú, la transferencia se realiza con garantías adecuadas."],
      ["6. Plazo de conservación", "Conservamos los datos mientras exista la relación comercial y, luego, por el plazo exigido por las normas tributarias y de protección al consumidor."],
      ["7. Derechos ARCO", `Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición escribiendo a ${STORE_INFO.email} con copia de tu documento de identidad. Responderemos en los plazos del Reglamento. Si no estás conforme, puedes acudir a la Autoridad Nacional de Protección de Datos Personales del Ministerio de Justicia y Derechos Humanos.`],
      ["8. Seguridad", "Aplicamos medidas técnicas, organizativas y legales: cifrado TLS, control de accesos y registro de operaciones."],
      ["9. Cookies", "Usamos cookies necesarias para el carrito y la sesión. Las cookies analíticas y de marketing solo se activan si las aceptas desde el banner o la configuración de cookies."],
    ],
  },
  shipping: {
    title: "Envíos, Cambios y Devoluciones",
    sections: [
      ["Cobertura", `Delivery propio en Lima Metropolitana y Callao; envíos a los 24 departamentos del Perú mediante Olva Courier (domicilio) y Shalom (recojo en agencia). Recojo gratuito en ${PICKUP_POINTS.join(" o ")}. Plazo de entrega: ${DELIVERY_TIME}.`],
      ["Costos", "Lima: desde S/ 8 según distrito; gratis en compras desde S/ 500. Provincias: Olva Courier S/ 18 y Shalom S/ 12 por paquete estándar (hasta 2 kg)."],
      ["Embalaje", "Singles en funda y top loader dentro de bolsa sellada; producto sellado con protección de burbuja y caja rígida. Envíos de más de S/ 1 000 incluyen seguro."],
      ["Cambios y devoluciones", "Si recibes un producto distinto al comprado, dañado en el transporte o en un estado inferior al publicado, repórtalo dentro de los 7 días calendario siguientes a la entrega con fotos o el video del unboxing. Te ofrecemos cambio, nota de crédito o devolución del importe, a tu elección. El producto sellado debe conservar su film original."],
      ["No procede", "Sobres abiertos o producto sellado sin film (por su naturaleza aleatoria), ni cambios por el contenido obtenido al abrir un sobre."],
      ["Reembolsos", "Se procesan por el mismo medio de pago en un máximo de 15 días hábiles desde la aprobación."],
    ],
  },
};

function LegalModal({ doc, onClose }) {
  if (!doc) return null;
  const d = LEGAL[doc];
  return (
    <Modal open onClose={onClose} title={d.title} subtitle={`Última actualización: ${fmtDate(new Date())}`} icon={FileText} size="max-w-3xl">
      <div className="space-y-5 max-w-prose">
        {d.sections.map(([h, t]) => (
          <section key={h}>
            <h3 className="pk-display font-bold c-ink">{h}</h3>
            <p className="text-sm c-ink leading-relaxed mt-1">{t}</p>
          </section>
        ))}
        <p className="text-xs c-ink2 border-t b-line pt-4">
          Texto modelo de referencia. Antes de publicar la tienda, valida la razón social, el RUC, la inscripción del banco de datos y los plazos con tu asesor legal.
        </p>
      </div>
    </Modal>
  );
}

/* ---------- Cookies ---------- */

function CookieBanner({ consent, setConsent, openSettings, openPrivacy }) {
  if (consent.decided) return null;
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-3 sm:p-4">
      <div className="pk-in max-w-4xl mx-auto rounded-3xl bg-white border-2 b-ink pop-lg p-4 flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex gap-3 flex-1">
          <div className="w-11 h-11 rounded-full bg-pika border-2 b-ink flex items-center justify-center shrink-0"><Cookie className="w-6 h-6 c-ink" strokeWidth={2.2} /></div>
          <p className="text-sm c-ink">
            Usamos cookies necesarias para que el carrito funcione y, con tu permiso, cookies analíticas y de marketing para mejorar tu experiencia. Lee nuestra{" "}
            <button onClick={openPrivacy} className="underline c-ember">Política de Privacidad</button>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Btn variant="ghost" onClick={openSettings}>Configurar</Btn>
          <Btn variant="outline" onClick={() => setConsent({ decided: true, analytics: false, marketing: false })}>Rechazar</Btn>
          <Btn onClick={() => setConsent({ decided: true, analytics: true, marketing: true })}>Aceptar</Btn>
        </div>
      </div>
    </div>
  );
}

function CookieSettings({ open, onClose, consent, setConsent }) {
  const [draft, setDraft] = useState(consent);
  useEffect(() => { if (open) setDraft(consent); }, [open, consent]);
  if (!open) return null;
  const row = (k, t, d, locked) => (
    <div className="flex items-start justify-between gap-4 py-3 border-b-2 b-line">
      <div>
        <div className="font-semibold text-sm">{t}</div>
        <div className="text-xs c-ink2">{d}</div>
      </div>
      <button
        type="button"
        disabled={locked}
        onClick={() => setDraft({ ...draft, [k]: !draft[k] })}
        className={`relative w-11 h-6 rounded-full shrink-0 transition ${locked || draft[k] ? "bg-ember" : "bg-stone-300"} ${locked ? "opacity-60" : ""}`}
        aria-pressed={locked || !!draft[k]}
        aria-label={t}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${locked || draft[k] ? "left-5" : "left-0.5"}`} />
      </button>
    </div>
  );
  return (
    <Modal open onClose={onClose} title="Configuración de cookies" icon={Cookie} size="max-w-lg">
      {row("necessary", "Necesarias", "Carrito, sesión y seguridad. Siempre activas.", true)}
      {row("analytics", "Analíticas", "Nos ayudan a entender qué productos buscas.", false)}
      {row("marketing", "Marketing", "Anuncios de preventas en redes sociales.", false)}
      <div className="flex justify-end gap-2 mt-4">
        <Btn variant="outline" onClick={onClose}>Cancelar</Btn>
        <Btn onClick={() => { setConsent({ ...draft, decided: true }); onClose(); }}>Guardar preferencias</Btn>
      </div>
    </Modal>
  );
}

/* ---------- Panel de administración ---------- */

const emptyProduct = () => ({
  id: "", name: "", set: "", condition: CONDITIONS[1], price: 0, stock: 1, category: "Singles", image: "fire",
  isFeatured: false, rarity: RARITIES[0], active: true, description: "",
});

function ProductForm({ initial, onSave, onCancel }) {
  const [p, setP] = useState(initial);
  const [err, setErr] = useState("");
  const set = (k, num) => (e) => setP({ ...p, [k]: e.target.type === "checkbox" ? e.target.checked : num ? Number(e.target.value) : e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (!p.name.trim() || !p.set.trim()) return setErr("Nombre y set/edición son obligatorios.");
    if (!(p.price > 0)) return setErr("El precio debe ser mayor a 0.");
    if (p.stock < 0) return setErr("El stock no puede ser negativo.");
    onSave({ ...p, id: p.id || `p${Date.now().toString(36)}` });
  };
  return (
    <form onSubmit={submit} className="grid sm:grid-cols-2 gap-3">
      <Field label="Nombre" className="sm:col-span-2"><input id="pf-name" className={inputCls()} value={p.name} onChange={set("name")} /></Field>
      <Field label="Set / edición"><input id="pf-set" className={inputCls()} value={p.set} onChange={set("set")} /></Field>
      <Field label="Categoría">
        <select id="pf-cat" className={inputCls()} value={p.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
      </Field>
      <Field label="Rareza">
        <select id="pf-rarity" className={inputCls()} value={p.rarity} onChange={set("rarity")}>{RARITIES.map((c) => <option key={c}>{c}</option>)}</select>
      </Field>
      <Field label="Condición">
        <select id="pf-cond" className={inputCls()} value={p.condition} onChange={set("condition")}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select>
      </Field>
      <Field label="Precio (S/)"><input id="pf-price" type="number" min="0" step="0.5" className={`${inputCls()} pk-mono`} value={p.price} onChange={set("price", true)} /></Field>
      <Field label="Stock"><input id="pf-stock" type="number" min="0" className={`${inputCls()} pk-mono`} value={p.stock} onChange={set("stock", true)} /></Field>
      <Field label="Imagen" hint="URL de imagen o tipo de arte: fire, water, grass, electric, psychic, dark, dragon, metal, fairy, colorless." className="sm:col-span-2">
        <input id="pf-image" className={inputCls()} value={p.image} onChange={set("image")} />
      </Field>
      <Field label="Descripción" className="sm:col-span-2"><textarea id="pf-desc" rows={3} className={inputCls()} value={p.description} onChange={set("description")} /></Field>
      <label className="flex items-center gap-2 text-sm"><input id="pf-feat" type="checkbox" checked={p.isFeatured} onChange={set("isFeatured")} /> Destacado en portada</label>
      <label className="flex items-center gap-2 text-sm"><input id="pf-active" type="checkbox" checked={p.active} onChange={set("active")} /> Disponible para la venta</label>
      {err && <p className="sm:col-span-2 text-sm font-bold c-err">{err}</p>}
      <div className="sm:col-span-2 flex justify-end gap-2">
        <Btn variant="outline" type="button" onClick={onCancel}>Cancelar</Btn>
        <Btn type="submit">Guardar producto</Btn>
      </div>
    </form>
  );
}

function AdminPanel({ open, onClose, products, updateProduct, saveProduct, deleteProduct, settings, setSettings, orders, setOrderStatus, claims, setClaimStatus, onReset, notify, remote }) {
  const [tab, setTab] = useState("inventory");
  const [editing, setEditing] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  if (!open) return null;

  const update = updateProduct;
  const t = settings.lowStockThreshold;
  const stats = {
    units: products.reduce((a, p) => a + p.stock, 0),
    value: products.reduce((a, p) => a + p.stock * p.price, 0),
    low: products.filter((p) => stockStatus(p, t).key === "low").length,
    out: products.filter((p) => stockStatus(p, t).key === "out").length,
  };

  const tabs = [
    ["inventory", "Inventario", Package],
    ["orders", `Pedidos (${orders.length})`, ClipboardList],
    ["claims", `Reclamos (${claims.length})`, BookOpen],
    ["settings", "Configuración", Settings],
  ];

  return (
    <div className="fixed inset-0 z-50 bg-paper overflow-y-auto" role="dialog" aria-modal="true" aria-label="Panel de administración">
      <div className="sticky top-0 z-10 bg-ink text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Settings className="w-5 h-5 c-pika" />
          <div className="flex-1">
            <div className="pk-display font-bold">Gestión rápida · PokeAlt</div>
            <div className="text-xs text-white/70">{remote ? "Los cambios se guardan en la base de datos y se ven en la tienda al instante." : "Modo demo: los cambios se guardan solo en este navegador."}</div>
          </div>
          <Btn variant="accent" onClick={onClose}><Eye className="w-4 h-4" /> Ver tienda</Btn>
        </div>
        <div className="max-w-6xl mx-auto px-4 flex gap-1 overflow-x-auto">
          {tabs.map(([k, l, Icon]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 ${tab === k ? "border-yellow-400 c-pika" : "border-transparent text-white/70 hover:text-white"}`}>
              <Icon className="w-4 h-4" /> {l}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {tab === "inventory" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ["Unidades en stock", stats.units, "c-ink"],
                ["Valor del inventario", fmtPEN(stats.value), "c-ink"],
                ["Pocas unidades", stats.low, "c-ember"],
                ["Agotados", stats.out, "c-err"],
              ].map(([l, v, c]) => (
                <div key={l} className="pk-frame p-4">
                  <div className="text-xs c-ink2 uppercase tracking-wide font-semibold">{l}</div>
                  <div className={`pk-mono text-2xl font-bold mt-1 ${c}`}>{v}</div>
                </div>
              ))}
            </div>

            {editing ? (
              <div className="pk-frame p-5">
                <h3 className="pk-display font-bold text-lg mb-4">{editing.id ? `Editar: ${editing.name}` : "Nuevo producto"}</h3>
                <ProductForm
                  initial={editing}
                  onCancel={() => setEditing(null)}
                  onSave={async (p) => {
                    try {
                      const saved = await saveProduct(p);
                      setEditing(null);
                      notify(`Producto guardado: ${saved.name}`);
                    } catch (e) {
                      notify(e.message || "No se pudo guardar el producto.", "error");
                    }
                  }}
                />
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <h3 className="pk-display font-bold text-lg">Productos ({products.length})</h3>
                <Btn onClick={() => setEditing(emptyProduct())}><Plus className="w-4 h-4" /> Agregar producto</Btn>
              </div>
            )}

            <div className="pk-frame overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-paper text-xs uppercase tracking-wide c-ink2">
                  <tr>
                    <th className="text-left px-3 py-2">Producto</th>
                    <th className="text-left px-3 py-2">Precio (S/)</th>
                    <th className="text-left px-3 py-2">Stock</th>
                    <th className="text-left px-3 py-2">Estado</th>
                    <th className="text-left px-3 py-2">Visible</th>
                    <th className="text-right px-3 py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {products.map((p) => (
                    <tr key={p.id} className="align-middle">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2 min-w-56">
                          <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border-2 b-ink"><ProductArt product={p} /></div>
                          <div className="min-w-0">
                            <div className="font-semibold c-ink truncate max-w-xs">{p.name}</div>
                            <div className="text-xs c-ink2">{p.category} · {p.condition}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          id={`price-${p.id}`}
                          type="number"
                          min="0"
                          step="0.5"
                          value={p.price}
                          onChange={(e) => update(p.id, { price: Math.max(0, Number(e.target.value)) })}
                          className="w-24 pk-input-sm pk-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => update(p.id, { stock: Math.max(0, p.stock - 1) })} className="p-1 rounded-full border-2 b-ink bg-white hover:bg-pika50" aria-label="Restar stock"><Minus className="w-3.5 h-3.5" /></button>
                          <input
                            id={`stock-${p.id}`}
                            type="number"
                            min="0"
                            value={p.stock}
                            onChange={(e) => update(p.id, { stock: Math.max(0, Math.floor(Number(e.target.value))) })}
                            className="w-16 pk-input-sm pk-mono text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                          <button onClick={() => update(p.id, { stock: p.stock + 1 })} className="p-1 rounded-full border-2 b-ink bg-white hover:bg-pika50" aria-label="Sumar stock"><Plus className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                      <td className="px-3 py-2"><StockTag product={p} threshold={t} /></td>
                      <td className="px-3 py-2">
                        <button
                          onClick={() => update(p.id, { active: !p.active })}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${p.active ? "bg-okc text-white border-2 b-ink" : "bg-paper c-ink2 border-2 b-line"}`}
                        >
                          {p.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          {p.active ? "A la venta" : "Marcado agotado"}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => update(p.id, { isFeatured: !p.isFeatured })} className={`p-1.5 rounded hover:bg-paper ${p.isFeatured ? "text-yellow-500" : "c-ink2"}`} aria-label="Destacar"><Star className="w-4 h-4" /></button>
                          <button onClick={() => setEditing(p)} className="p-1.5 rounded hover:bg-paper c-ink2" aria-label="Editar"><Pencil className="w-4 h-4" /></button>
                          <button onClick={async () => { try { await deleteProduct(p.id); notify(`Eliminado: ${p.name}`); } catch (e) { notify(e.message || "No se pudo eliminar.", "error"); } }} className="p-1.5 rounded hover:bg-pika50 c-ink2 hover:text-orange-600" aria-label="Eliminar"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "orders" && (
          <div className="pk-frame overflow-x-auto">
            {orders.length === 0 ? (
              <div className="p-10 text-center c-ink2">
                <ClipboardList className="w-8 h-8 mx-auto c-ink2" />
                <p className="mt-2">Aún no hay pedidos. Haz una compra de prueba desde la tienda.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-paper text-xs uppercase tracking-wide c-ink2">
                  <tr>
                    <th className="text-left px-3 py-2">Pedido</th>
                    <th className="text-left px-3 py-2">Cliente</th>
                    <th className="text-left px-3 py-2">Ítems</th>
                    <th className="text-left px-3 py-2">Pago</th>
                    <th className="text-right px-3 py-2">Total</th>
                    <th className="text-left px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="px-3 py-2"><div className="pk-mono font-bold">{o.id}</div><div className="text-xs c-ink2">{fmtDate(o.createdAt)}</div></td>
                      <td className="px-3 py-2"><div>{o.customer.name}</div><div className="text-xs c-ink2">{o.customer.docType} {o.customer.doc} · {o.customer.phone}</div></td>
                      <td className="px-3 py-2 text-xs">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                      <td className="px-3 py-2 text-xs">{o.method}</td>
                      <td className="px-3 py-2 text-right pk-mono font-semibold">{fmtPEN(o.total)}</td>
                      <td className="px-3 py-2">
                        <select id={`os-${o.id}`} value={o.status} onChange={(e) => setOrderStatus(o.id, e.target.value)} className="pk-input-sm text-xs">
                          {["Pendiente de verificación", "Pendiente de pago", "Pagado", "Enviado", "Entregado", "Cancelado"].map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "claims" && (
          <div className="pk-frame overflow-x-auto">
            {claims.length === 0 ? (
              <div className="p-10 text-center c-ink2">
                <BookOpen className="w-8 h-8 mx-auto c-ink2" />
                <p className="mt-2">No hay hojas de reclamación registradas.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-paper text-xs uppercase tracking-wide c-ink2">
                  <tr>
                    <th className="text-left px-3 py-2">Hoja N°</th>
                    <th className="text-left px-3 py-2">Tipo</th>
                    <th className="text-left px-3 py-2">Consumidor</th>
                    <th className="text-left px-3 py-2">Detalle</th>
                    <th className="text-left px-3 py-2">Vence</th>
                    <th className="text-left px-3 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {claims.map((c) => (
                    <tr key={c.number}>
                      <td className="px-3 py-2 pk-mono font-bold">{c.number}</td>
                      <td className="px-3 py-2 capitalize">{c.kind}</td>
                      <td className="px-3 py-2"><div>{c.names} {c.lastNames}</div><div className="text-xs c-ink2">{c.email}</div></td>
                      <td className="px-3 py-2 text-xs max-w-xs">{c.detail}</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">{fmtDate(c.dueAt)}</td>
                      <td className="px-3 py-2">
                        <select id={`cs-${c.number}`} value={c.status} onChange={(e) => setClaimStatus(c.number, e.target.value)} className="pk-input-sm text-xs">
                          {["Pendiente", "En evaluación", "Respondido"].map((s) => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="pk-frame p-5 space-y-4">
              <h3 className="pk-display font-bold text-lg flex items-center gap-2"><Smartphone className="w-5 h-5" /> Billeteras digitales</h3>
              <Field label="Celular Yape"><input id="s-yape" className={`${inputCls()} pk-mono`} value={settings.yapeNumber} onChange={(e) => setSettings({ ...settings, yapeNumber: e.target.value })} /></Field>
              <Field label="Celular Plin"><input id="s-plin" className={`${inputCls()} pk-mono`} value={settings.plinNumber} onChange={(e) => setSettings({ ...settings, plinNumber: e.target.value })} /></Field>
              <Field label="Titular mostrado"><input id="s-holder" className={inputCls()} value={settings.walletHolder} onChange={(e) => setSettings({ ...settings, walletHolder: e.target.value })} /></Field>
            </div>
            <div className="pk-frame p-5 space-y-4">
              <h3 className="pk-display font-bold text-lg flex items-center gap-2"><Tag className="w-5 h-5" /> Reglas de la tienda</h3>
              <Field label="Umbral de “Pocas unidades”" hint="Productos con este stock o menos muestran la alerta.">
                <input id="s-threshold" type="number" min="1" className={`${inputCls()} pk-mono`} value={settings.lowStockThreshold} onChange={(e) => setSettings({ ...settings, lowStockThreshold: Math.max(1, Number(e.target.value)) })} />
              </Field>
              <Field label="Delivery gratis en Lima desde (S/)">
                <input id="s-free" type="number" min="0" className={`${inputCls()} pk-mono`} value={settings.freeShippingFrom} onChange={(e) => setSettings({ ...settings, freeShippingFrom: Math.max(0, Number(e.target.value)) })} />
              </Field>
              {onReset && <div className="pt-4 border-t b-line">
                {confirmReset ? (
                  <div className="rounded-2xl bg-white border-2 b-ember p-3 text-sm space-y-2">
                    <p className="c-ink font-semibold">Se restaurarán productos, configuración, pedidos, reclamos y carrito de demostración. ¿Continuar?</p>
                    <div className="flex gap-2">
                      <Btn variant="danger" onClick={() => { onReset(); setConfirmReset(false); }}>Sí, restaurar</Btn>
                      <Btn variant="outline" onClick={() => setConfirmReset(false)}>Cancelar</Btn>
                    </div>
                  </div>
                ) : (
                  <Btn variant="outline" onClick={() => setConfirmReset(true)}><RotateCcw className="w-4 h-4" /> Restaurar datos de demostración</Btn>
                )}
              </div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Cuenta de cliente (solo con backend real) ---------- */

function AccountModal({ open, onClose, backend, session, profile, onProfile, recovery, onRecoveryDone, isAdmin, openAdmin, notify }) {
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [form, setForm] = useState({ fullName: "", alias: "", docType: "DNI", docNumber: "", phone: "" });
  const [errors, setErrors] = useState({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open && profile) {
      setForm({
        fullName: profile.fullName || "",
        alias: profile.alias || "",
        docType: profile.docType || "DNI",
        docNumber: profile.docNumber || "",
        phone: profile.phone || "",
      });
    }
    if (open) {
      setErrors({});
      setMsg("");
    }
  }, [open, profile]);

  if (!open) return null;

  const run = async (fn) => {
    setBusy(true);
    setErrors({});
    setMsg("");
    try {
      await fn();
    } catch (e) {
      setErrors({ form: e.message || "Algo salió mal. Intenta de nuevo." });
    } finally {
      setBusy(false);
    }
  };

  const auth = (e) => {
    e.preventDefault();
    if (!emailValid(email)) return setErrors({ email: "Revisa el correo electrónico." });
    if (tab !== "forgot" && password.length < 6) return setErrors({ password: "Mínimo 6 caracteres." });
    run(async () => {
      if (tab === "login") {
        await backend.signIn(email.trim(), password);
        notify("Sesión iniciada.");
      } else if (tab === "signup") {
        const r = await backend.signUp(email.trim(), password);
        setMsg(r.needsConfirmation ? "Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego ingresa aquí." : "Cuenta creada. Completa tu perfil para poder pujar.");
      } else {
        await backend.resetPassword(email.trim());
        setMsg("Si el correo tiene una cuenta, te llegará un enlace para crear una nueva contraseña.");
      }
    });
  };

  const saveProfile = (e) => {
    e.preventDefault();
    const er = {};
    if (form.fullName.trim().split(/\s+/).length < 2) er.fullName = "Escribe nombres y apellidos.";
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(form.alias.trim())) er.alias = "De 3 a 20 letras, números, punto o guion bajo.";
    const d = validateDoc(form.docType, form.docNumber);
    if (d) er.docNumber = d;
    if (!phoneValid(form.phone)) er.phone = "Celular de 9 dígitos que empiece con 9.";
    setErrors(er);
    if (Object.keys(er).length) return;
    run(async () => {
      const saved = await backend.saveProfile(session.user.id, {
        fullName: form.fullName.trim(),
        alias: form.alias.trim(),
        docType: form.docType,
        docNumber: form.docNumber.trim(),
        phone: onlyDigits(form.phone).replace(/^51/, ""),
      });
      onProfile(saved);
      notify("Perfil guardado. Ya puedes pujar.");
    });
  };

  const newPassword = (e) => {
    e.preventDefault();
    if (password.length < 6) return setErrors({ password: "Mínimo 6 caracteres." });
    run(async () => {
      await backend.updatePassword(password);
      setPassword("");
      onRecoveryDone();
      notify("Contraseña actualizada.");
    });
  };

  return (
    <Modal open onClose={onClose} title={session ? "Mi cuenta" : "Ingresa a PokeAlt"} subtitle={session ? session.user.email : "Necesitas una cuenta para pujar en las subastas"} icon={User} size="max-w-lg">
      {recovery && session ? (
        <form onSubmit={newPassword} className="space-y-3">
          <Field label="Nueva contraseña" error={errors.password}>
            <input id="acc-newpass" type="password" className={inputCls(errors.password)} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </Field>
          {errors.form && <p className="text-sm font-bold c-err">{errors.form}</p>}
          <Btn type="submit" className="w-full" disabled={busy}>Guardar contraseña</Btn>
        </form>
      ) : !session ? (
        <div className="space-y-4">
          <div className="flex gap-1.5">
            {[["login", "Ingresar"], ["signup", "Crear cuenta"]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => { setTab(k); setErrors({}); setMsg(""); }} className={`pk-tab flex-1 ${tab === k ? "on" : "c-ink border-2 b-line"}`}>{l}</button>
            ))}
          </div>
          <form onSubmit={auth} className="space-y-3">
            <Field label="Correo electrónico" error={errors.email}>
              <input id="acc-email" className={inputCls(errors.email)} value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="email" />
            </Field>
            {tab !== "forgot" && (
              <Field label="Contraseña" error={errors.password}>
                <input id="acc-pass" type="password" className={inputCls(errors.password)} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={tab === "signup" ? "new-password" : "current-password"} />
              </Field>
            )}
            {errors.form && <p className="text-sm font-bold c-err">{errors.form}</p>}
            {msg && <p className="text-sm font-bold c-ok">{msg}</p>}
            <Btn type="submit" className="w-full" disabled={busy}>
              {busy ? "Un momento…" : tab === "login" ? "Ingresar" : tab === "signup" ? "Crear cuenta" : "Enviar enlace"}
            </Btn>
          </form>
          <button type="button" onClick={() => { setTab(tab === "forgot" ? "login" : "forgot"); setErrors({}); setMsg(""); }} className="text-sm font-bold c-ember hover:underline">
            {tab === "forgot" ? "Volver a ingresar" : "¿Olvidaste tu contraseña?"}
          </button>
        </div>
      ) : (
        <form onSubmit={saveProfile} className="space-y-3">
          {!(profile && profile.alias && profile.docNumber) && (
            <div className="rounded-2xl bg-pika50 border-2 b-ink p-3 text-sm c-ink font-semibold">
              Completa tu perfil para poder pujar. Tu alias es lo único que otros coleccionistas ven.
            </div>
          )}
          <Field label="Nombres y apellidos" error={errors.fullName}>
            <input id="acc-name" className={inputCls(errors.fullName)} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} autoComplete="name" />
          </Field>
          <Field label="Alias público" error={errors.alias} hint="Se muestra en el historial de pujas.">
            <input id="acc-alias" className={inputCls(errors.alias)} value={form.alias} onChange={(e) => setForm({ ...form, alias: e.target.value })} placeholder="Ej. AshLima" />
          </Field>
          <Field label="Documento" error={errors.docNumber}>
            <div className="flex gap-2">
              <select id="acc-doctype" className={`${inputCls()} !w-24`} value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })}>
                <option>DNI</option><option>CE</option>
              </select>
              <input id="acc-doc" className={inputCls(errors.docNumber)} value={form.docNumber} onChange={(e) => setForm({ ...form, docNumber: e.target.value })} />
            </div>
          </Field>
          <Field label="Celular" error={errors.phone}>
            <input id="acc-phone" className={inputCls(errors.phone)} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="9XX XXX XXX" inputMode="tel" />
          </Field>
          {errors.form && <p className="text-sm font-bold c-err">{errors.form}</p>}
          <Btn type="submit" className="w-full" disabled={busy}>{busy ? "Guardando…" : "Guardar perfil"}</Btn>
          <div className="flex flex-wrap gap-2 justify-between pt-2 border-t-2 b-line">
            {isAdmin && (
              <Btn variant="dark" size="sm" type="button" onClick={() => { onClose(); openAdmin(); }}><Settings className="w-4 h-4" /> Panel admin</Btn>
            )}
            <Btn variant="ghost" size="sm" type="button" onClick={() => run(async () => { await backend.signOut(); onClose(); notify("Sesión cerrada."); })}>Cerrar sesión</Btn>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ---------- Toasts ---------- */

function Toasts({ items }) {
  return (
    <div className="fixed top-24 right-4 z-50 space-y-2 w-80 max-w-full pointer-events-none" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`pointer-events-auto pk-in rounded-full soft px-4 py-2.5 text-sm font-bold flex gap-2 items-center border-2 b-ink ${t.type === "error" ? "bg-ember text-white" : "bg-ink text-white"}`}>
          {t.type === "error" ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0 c-pika" />}
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}

/* =================================================================
 * 5. APP (estado global centralizado)
 * ================================================================= */

export default function PokealtStore({ backend = localBackend }) {
  const remote = backend.mode !== "local";
  // Con backend real, la caché local usa otras claves y arranca vacía hasta cargar la base de datos.
  const k = (key) => (remote ? `live.${key}` : key);

  // --- Estado de datos ---
  const [products, setProducts] = usePersistentState(k("products"), remote ? [] : INITIAL_PRODUCTS);
  const [settings, setSettings] = usePersistentState(k("settings"), INITIAL_SETTINGS);
  const [cart, setCart] = usePersistentState(k("cart"), {}); // { [productId]: qty }
  const [orders, setOrders] = usePersistentState(k("orders"), []);
  const [claims, setClaims] = usePersistentState(k("claims"), []);
  const [claimSeq, setClaimSeq] = usePersistentState("claimSeq", 1);
  const [cookies, setCookies] = usePersistentState("cookies", { decided: false, analytics: false, marketing: false });
  const [auction, setAuction] = usePersistentState(k("auction"), remote ? null : {
    ...INITIAL_AUCTION,
    endAt: Date.now() + (2 * 86400 + 5 * 3600 + 17 * 60) * 1000,
  });

  // --- Sesión (solo con backend real) ---
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [recovery, setRecovery] = useState(false);
  const [loading, setLoading] = useState(remote);
  const isAdmin = !remote || profile?.role === "admin";

  // --- Estado de UI ---
  const [favs, setFavs] = usePersistentState("favorites", []);
  const [onlyFavs, setOnlyFavs] = useState(false);
  const toggleFav = (id) => setFavs((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [claimsOpen, setClaimsOpen] = useState(false);
  const [legalDoc, setLegalDoc] = useState(null);
  const [cookieSettingsOpen, setCookieSettingsOpen] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [toasts, setToasts] = useState([]);

  const notify = (msg, type = "ok") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  };

  const threshold = settings.lowStockThreshold;

  // Ediciones del admin pendientes de guardar (se agrupan para no enviar una petición por tecla).
  const pendingProducts = useRef({});
  const pendingSettings = useRef(null);

  // Carga inicial, tiempo real y sesión
  useEffect(() => {
    if (!remote) return undefined;
    let alive = true;
    backend
      .loadCatalog()
      .then((d) => {
        if (!alive) return;
        setProducts(d.products);
        if (d.settings) setSettings(d.settings);
        setAuction(d.auction);
      })
      .catch((e) => notify(e.message || "No se pudo cargar la tienda.", "error"))
      .finally(() => alive && setLoading(false));
    const unsubscribe = backend.subscribe({
      onProduct: (p) => {
        if (pendingProducts.current[p.id]) return;
        setProducts((ps) => (ps.some((x) => x.id === p.id) ? ps.map((x) => (x.id === p.id ? p : x)) : [...ps, p]));
      },
      onProductDeleted: (id) => setProducts((ps) => ps.filter((x) => x.id !== id)),
      onSettings: (s) => !pendingSettings.current && setSettings(s),
      onAuction: (a) => setAuction((cur) => (!cur || cur.id === a.id || a.endAt > Date.now() ? a : cur)),
    });
    const unauth = backend.onAuthChange((s, prof, event) => {
      if (!alive) return;
      setSession(s);
      setProfile(prof);
      if (event === "PASSWORD_RECOVERY") {
        setRecovery(true);
        setAccountOpen(true);
      }
    });
    return () => {
      alive = false;
      unsubscribe();
      unauth();
    };
  }, [backend]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pedidos y reclamos se cargan al abrir el panel admin
  useEffect(() => {
    if (!remote || !adminOpen || !isAdmin) return;
    backend
      .loadAdminData()
      .then((d) => {
        setOrders(d.orders);
        setClaims(d.claims);
      })
      .catch((e) => notify(e.message, "error"));
  }, [adminOpen, isAdmin]); // eslint-disable-line react-hooks/exhaustive-deps

  // Migración: quita la razón social de ejemplo guardada en navegadores de versiones anteriores.
  useEffect(() => {
    if (!remote && settings.walletHolder === "POKEALT S.A.C.") setSettings((st) => ({ ...st, walletHolder: "PokeAlt" }));
  }, [settings.walletHolder, setSettings, remote]);

  // El carrito nunca supera el stock real (p. ej. si el admin reduce stock).
  useEffect(() => {
    if (loading) return;
    setCart((c) => {
      let changed = false;
      const next = {};
      for (const [id, qty] of Object.entries(c)) {
        const p = products.find((x) => x.id === id);
        const max = p && p.active ? p.stock : 0;
        const q = Math.min(qty, max);
        if (q !== qty) changed = true;
        if (q > 0) next[id] = q;
      }
      return changed ? next : c;
    });
  }, [products, setCart, loading]);

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const subtotal = Object.entries(cart).reduce((a, [id, q]) => a + (products.find((p) => p.id === id)?.price || 0) * q, 0);
  const featured = products.filter((p) => p.isFeatured && stockStatus(p, threshold).key !== "out");

  const addToCart = (p) => {
    const current = cart[p.id] || 0;
    if (!p.active || current >= p.stock) {
      notify(`No hay más unidades disponibles de ${p.name}.`, "error");
      return;
    }
    setCart({ ...cart, [p.id]: current + 1 });
    notify(`Agregado al carrito: ${p.name}`);
  };
  const setQty = (id, qty) => {
    const p = products.find((x) => x.id === id);
    const q = Math.max(0, Math.min(qty, p ? p.stock : 0));
    const next = { ...cart };
    if (q === 0) delete next[id];
    else next[id] = q;
    setCart(next);
  };
  const removeFromCart = (id) => setQty(id, 0);

  /* ----- Acciones (demo en el navegador o backend real) ----- */

  const updateProduct = (id, patch) => {
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    if (!remote) return;
    const entry = pendingProducts.current[id] || { patch: {} };
    clearTimeout(entry.timer);
    entry.patch = { ...entry.patch, ...patch };
    entry.timer = setTimeout(async () => {
      delete pendingProducts.current[id];
      try {
        await backend.updateProduct(id, entry.patch);
      } catch (e) {
        notify(e.message || "No se pudo guardar el cambio.", "error");
      }
    }, 600);
    pendingProducts.current[id] = entry;
  };

  const saveProduct = async (p) => {
    const exists = products.some((x) => x.id === p.id);
    const saved = !remote ? p : exists ? await backend.updateProduct(p.id, p) : await backend.createProduct(p);
    setProducts((ps) => (exists ? ps.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...ps.filter((x) => x.id !== saved.id)]));
    return saved;
  };

  const deleteProduct = async (id) => {
    if (remote) await backend.deleteProduct(id);
    setProducts((ps) => ps.filter((x) => x.id !== id));
  };

  const updateSettings = (s) => {
    setSettings(s);
    if (!remote) return;
    clearTimeout(pendingSettings.current);
    pendingSettings.current = setTimeout(async () => {
      pendingSettings.current = null;
      try {
        await backend.saveSettings(s);
      } catch (e) {
        notify(e.message || "No se pudo guardar la configuración.", "error");
      }
    }, 600);
  };

  const placeOrder = async (order) => {
    if (remote) {
      const saved = await backend.placeOrder(order); // el servidor valida stock y precios
      setCart({});
      backend.loadProducts().then(setProducts).catch(() => {});
      if (isAdmin) setOrders((os) => [saved, ...os]);
      return saved;
    }
    setProducts((ps) => ps.map((p) => {
      const item = order.items.find((i) => i.id === p.id);
      return item ? { ...p, stock: Math.max(0, p.stock - item.qty) } : p;
    }));
    setOrders((os) => [order, ...os]);
    setCart({});
    return order;
  };

  const setOrderStatus = async (id, status) => {
    const order = orders.find((o) => o.id === id);
    if (!order) return;
    if (remote) {
      try {
        const st = await backend.setOrderStatus(id, status);
        setOrders((os) => os.map((o) => (o.id === id ? { ...o, status: st } : o)));
      } catch (e) {
        notify(e.message, "error");
      }
      return;
    }
    // Cancelar devuelve las unidades al stock (solo una vez).
    if (status === "Cancelado" && order.status !== "Cancelado") {
      setProducts((ps) => ps.map((p) => {
        const it = order.items.find((i) => i.id === p.id);
        return it ? { ...p, stock: p.stock + it.qty } : p;
      }));
    }
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const submitClaim = async (claim) => {
    if (remote) {
      const saved = await backend.submitClaim(claim);
      if (isAdmin) setClaims((cs) => [saved, ...cs]);
      return saved;
    }
    setClaims((cs) => [claim, ...cs]);
    setClaimSeq((n) => n + 1);
    return claim;
  };

  const setClaimStatus = async (number, status) => {
    try {
      if (remote) await backend.setClaimStatus(number, status);
      setClaims((cs) => cs.map((x) => (x.number === number ? { ...x, status } : x)));
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const placeBid = async (alias, amount) => {
    if (remote) {
      setAuction(await backend.placeBid(auction.id, amount)); // el servidor valida monto, cierre y perfil
      return;
    }
    setAuction((a) => ({ ...a, bids: [{ alias, amount, at: "ahora" }, ...a.bids].slice(0, 20) }));
  };

  const subscribeStockAlert = async (phone) => {
    if (remote) await backend.subscribeStockAlert(phone);
  };

  const resetDemo = () => {
    setProducts(INITIAL_PRODUCTS);
    setSettings(INITIAL_SETTINGS);
    setCart({});
    setOrders([]);
    setClaims([]);
    setClaimSeq(1);
    setAuction({ ...INITIAL_AUCTION, endAt: Date.now() + (2 * 86400 + 5 * 3600) * 1000 });
    notify("Datos de demostración restaurados.");
  };

  return (
    <div className="pk-root min-h-screen antialiased">
      <FontStyles />
      <Header
        query={query}
        setQuery={setQuery}
        category={category}
        setCategory={setCategory}
        cartCount={cartCount}
        onCart={() => setCartOpen(true)}
        onAdmin={() => setAdminOpen(true)}
        adminMode={adminOpen}
        onClaims={() => setClaimsOpen(true)}
        favCount={favs.length}
        onlyFavs={onlyFavs}
        setOnlyFavs={setOnlyFavs}
        settings={settings}
        remote={remote}
        isAdmin={isAdmin}
        profile={profile}
        onAccount={() => setAccountOpen(true)}
      />

      <main>
        <Hero
          featured={featured}
          onView={setViewing}
          onAdd={addToCart}
          auction={auction}
          onBid={placeBid}
          notify={notify}
          threshold={threshold}
          remote={remote}
          profile={profile}
          onNeedAccount={() => setAccountOpen(true)}
          loading={loading}
        />
        <TrustStrip />
        <Catalog
          products={products}
          threshold={threshold}
          query={query}
          category={category}
          setCategory={setCategory}
          cart={cart}
          onAdd={addToCart}
          onView={setViewing}
          favs={favs}
          toggleFav={toggleFav}
          onlyFavs={onlyFavs}
          setOnlyFavs={setOnlyFavs}
          loading={loading}
        />
        <Community notify={notify} onSubscribe={subscribeStockAlert} />
      </main>

      <Footer openLegal={setLegalDoc} openClaims={() => setClaimsOpen(true)} openCookies={() => setCookieSettingsOpen(true)} />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        products={products}
        setQty={setQty}
        remove={removeFromCart}
        subtotal={subtotal}
        freeFrom={settings.freeShippingFrom}
        onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
      />
      <Checkout
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        cart={cart}
        products={products}
        subtotal={subtotal}
        settings={settings}
        onPlaced={placeOrder}
        openLegal={setLegalDoc}
        notify={notify}
        cardPayments={backend.cardPayments}
        profile={profile}
      />
      <ProductModal product={viewing} onClose={() => setViewing(null)} threshold={threshold} inCart={viewing ? cart[viewing.id] || 0 : 0} onAdd={addToCart} />
      <ComplaintsBook open={claimsOpen} onClose={() => setClaimsOpen(false)} products={products} claimSeq={remote ? null : claimSeq} onSubmit={submitClaim} />
      <LegalModal doc={legalDoc} onClose={() => setLegalDoc(null)} />
      {remote && (
        <AccountModal
          open={accountOpen}
          onClose={() => setAccountOpen(false)}
          backend={backend}
          session={session}
          profile={profile}
          onProfile={setProfile}
          recovery={recovery}
          onRecoveryDone={() => setRecovery(false)}
          isAdmin={isAdmin}
          openAdmin={() => setAdminOpen(true)}
          notify={notify}
        />
      )}
      <AdminPanel
        open={adminOpen && isAdmin}
        onClose={() => setAdminOpen(false)}
        products={products}
        updateProduct={updateProduct}
        saveProduct={saveProduct}
        deleteProduct={deleteProduct}
        settings={settings}
        setSettings={updateSettings}
        orders={orders}
        setOrderStatus={setOrderStatus}
        claims={claims}
        setClaimStatus={setClaimStatus}
        onReset={remote ? null : resetDemo}
        notify={notify}
        remote={remote}
      />
      <CookieSettings open={cookieSettingsOpen} onClose={() => setCookieSettingsOpen(false)} consent={cookies} setConsent={setCookies} />
      <CookieBanner consent={cookies} setConsent={setCookies} openSettings={() => setCookieSettingsOpen(true)} openPrivacy={() => setLegalDoc("privacy")} />
      <Toasts items={toasts} />
    </div>
  );
}
