/**
 * Backend de PokeAlt sobre Supabase (Postgres + Auth + Realtime).
 *
 * La tienda (Pokealt.jsx) no importa Supabase directamente: recibe este objeto
 * como prop `backend`. Sin backend, la tienda funciona en modo demo (localStorage).
 * Todas las operaciones sensibles (stock, pedidos, pujas, reclamos) se validan en
 * la base de datos con las funciones de supabase/schema.sql.
 */
import { createClient } from "@supabase/supabase-js";

/* ---------------------------- Mapeo de datos ---------------------------- */

const PRODUCT_FIELDS = {
  name: "name",
  set: "set_name",
  condition: "condition",
  price: "price",
  stock: "stock",
  category: "category",
  image: "image",
  isFeatured: "is_featured",
  rarity: "rarity",
  active: "active",
  description: "description",
};

const SETTINGS_FIELDS = {
  yapeNumber: "yape_number",
  plinNumber: "plin_number",
  walletHolder: "wallet_holder",
  lowStockThreshold: "low_stock_threshold",
  freeShippingFrom: "free_shipping_from",
};

const PROFILE_FIELDS = {
  fullName: "full_name",
  alias: "alias",
  docType: "doc_type",
  docNumber: "doc_number",
  phone: "phone",
};

const pick = (obj, fields) =>
  Object.fromEntries(Object.entries(obj || {}).filter(([k]) => k in fields).map(([k, v]) => [fields[k], v]));

export const toProduct = (r) => ({
  id: r.id,
  name: r.name,
  set: r.set_name,
  condition: r.condition,
  price: Number(r.price),
  stock: r.stock,
  category: r.category,
  image: r.image,
  isFeatured: r.is_featured,
  rarity: r.rarity,
  active: r.active,
  description: r.description,
});

export const toSettings = (r) => ({
  yapeNumber: r.yape_number,
  plinNumber: r.plin_number,
  walletHolder: r.wallet_holder,
  lowStockThreshold: r.low_stock_threshold,
  freeShippingFrom: Number(r.free_shipping_from),
});

export const toAuction = (r, bids = []) => ({
  id: r.id,
  title: r.title,
  grade: r.grade,
  image: r.image,
  startPrice: Number(r.start_price),
  increment: Number(r.increment),
  endAt: new Date(r.ends_at).getTime(),
  bidCount: r.bid_count,
  bids: bids.map((b) => ({ alias: b.alias, amount: Number(b.amount), createdAt: b.created_at })),
});

export const toOrder = (r) => ({
  id: r.id,
  createdAt: r.created_at,
  customer: r.customer || {},
  delivery: r.delivery || {},
  items: (r.order_items || []).map((i) => ({ id: i.product_id, name: i.name, price: Number(i.unit_price), qty: i.qty })),
  subtotal: Number(r.subtotal),
  shipping: Number(r.shipping),
  total: Number(r.total),
  method: r.method,
  status: r.status,
  marketing: r.marketing,
});

export const toClaim = (r) => ({
  ...(r.payload || {}),
  number: r.number,
  kind: r.kind,
  email: r.email,
  status: r.status,
  createdAt: r.created_at,
  dueAt: r.due_at,
});

export const toProfile = (r) =>
  r && {
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    alias: r.alias,
    docType: r.doc_type || "DNI",
    docNumber: r.doc_number,
    phone: r.phone,
    role: r.role,
  };

/* ------------------------------ Errores ------------------------------ */

const FRIENDLY = [
  [/Invalid login credentials/i, "Correo o contraseña incorrectos."],
  [/User already registered/i, "Ya existe una cuenta con ese correo."],
  [/Email not confirmed/i, "Confirma tu correo antes de ingresar (revisa tu bandeja de entrada)."],
  [/Password should be at least/i, "La contraseña debe tener al menos 6 caracteres."],
  [/rate limit/i, "Demasiados intentos. Espera unos minutos y vuelve a intentar."],
  [/profiles_alias_key/i, "Ese alias ya está en uso. Elige otro."],
  [/Failed to fetch|NetworkError/i, "No hay conexión con el servidor. Revisa tu internet."],
];

export function friendlyError(error) {
  const msg = (error && (error.message || error.error_description)) || String(error || "Error desconocido");
  for (const [re, text] of FRIENDLY) if (re.test(msg)) return text;
  return msg;
}

/* ------------------------------ Backend ------------------------------ */

export function createSupabaseBackend(url, key) {
  const sb = createClient(url, key);
  const must = ({ data, error }) => {
    if (error) throw new Error(friendlyError(error));
    return data;
  };

  const loadProducts = async () => must(await sb.from("products").select("*").order("created_at")).map(toProduct);

  const loadAuction = async (id) => {
    const row = must(await sb.from("auctions").select("*").eq("id", id).single());
    const bids = must(await sb.rpc("get_auction_bids", { p_auction_id: id, p_limit: 20 }));
    return toAuction(row, bids);
  };

  // Subasta destacada: la activa que cierra primero; si no hay, la última que terminó.
  const loadFeaturedAuction = async () => {
    const now = new Date().toISOString();
    let row = must(
      await sb.from("auctions").select("id").eq("is_featured", true).gt("ends_at", now).order("ends_at", { ascending: true }).limit(1).maybeSingle()
    );
    if (!row) row = must(await sb.from("auctions").select("id").eq("is_featured", true).order("ends_at", { ascending: false }).limit(1).maybeSingle());
    return row ? loadAuction(row.id) : null;
  };

  const loadProfile = async (userId) => toProfile(must(await sb.from("profiles").select("*").eq("id", userId).maybeSingle()));

  return {
    mode: "supabase",
    cardPayments: false, // se activa al integrar la pasarela de pagos
    client: sb,

    /* ---------- Catálogo ---------- */
    async loadCatalog() {
      const [products, settingsRow, auction] = await Promise.all([
        loadProducts(),
        sb.from("settings").select("*").eq("id", 1).maybeSingle().then(must),
        loadFeaturedAuction(),
      ]);
      return { products, settings: settingsRow ? toSettings(settingsRow) : null, auction };
    },
    loadProducts,
    async createProduct(p) {
      return toProduct(must(await sb.from("products").insert(pick(p, PRODUCT_FIELDS)).select().single()));
    },
    async updateProduct(id, patch) {
      return toProduct(must(await sb.from("products").update(pick(patch, PRODUCT_FIELDS)).eq("id", id).select().single()));
    },
    async deleteProduct(id) {
      must(await sb.from("products").delete().eq("id", id));
    },
    async saveSettings(s) {
      return toSettings(must(await sb.from("settings").update(pick(s, SETTINGS_FIELDS)).eq("id", 1).select().single()));
    },

    /* ---------- Pedidos ---------- */
    async placeOrder(order) {
      const row = must(
        await sb.rpc("place_order", {
          p_customer: order.customer,
          p_delivery: order.delivery,
          p_items: order.items.map((i) => ({ id: i.id, qty: i.qty })),
          p_shipping: order.shipping,
          p_method: order.methodKey,
          p_method_label: order.method,
          p_marketing: !!order.marketing,
        })
      );
      return toOrder({ ...row, order_items: order.items.map((i) => ({ product_id: i.id, name: i.name, unit_price: i.price, qty: i.qty })) });
    },
    async setOrderStatus(id, status) {
      return must(await sb.rpc("set_order_status", { p_order_id: id, p_status: status })).status;
    },

    /* ---------- Libro de Reclamaciones ---------- */
    async submitClaim(claim) {
      const { number, createdAt, dueAt, status, ...payload } = claim;
      return toClaim(must(await sb.rpc("submit_claim", { p_kind: claim.kind, p_email: claim.email, p_payload: payload })));
    },
    async setClaimStatus(number, status) {
      must(await sb.from("claims").update({ status }).eq("number", number));
    },

    /* ---------- Panel admin ---------- */
    async loadAdminData() {
      const [orders, claims] = await Promise.all([
        sb.from("orders").select("*, order_items(*)").order("created_at", { ascending: false }).limit(200).then(must),
        sb.from("claims").select("*").order("created_at", { ascending: false }).limit(200).then(must),
      ]);
      return { orders: orders.map(toOrder), claims: claims.map(toClaim) };
    },

    /* ---------- Subastas ---------- */
    loadAuction,
    async placeBid(auctionId, amount) {
      must(await sb.rpc("place_bid", { p_auction_id: auctionId, p_amount: amount }));
      return loadAuction(auctionId);
    },

    /* ---------- Alertas de stock ---------- */
    async subscribeStockAlert(phone) {
      const { error } = await sb.from("stock_alerts").insert({ phone });
      if (error && error.code !== "23505") throw new Error(friendlyError(error)); // 23505 = ya estaba suscrito
    },

    /* ---------- Tiempo real ---------- */
    subscribe({ onProduct, onProductDeleted, onSettings, onAuction }) {
      const channel = sb
        .channel("pokealt-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "products" }, (e) => {
          if (e.eventType === "DELETE") onProductDeleted?.(e.old.id);
          else onProduct?.(toProduct(e.new));
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "settings" }, (e) => onSettings?.(toSettings(e.new)))
        .on("postgres_changes", { event: "*", schema: "public", table: "auctions" }, async (e) => {
          if (e.eventType === "DELETE") return;
          try {
            onAuction?.(await loadAuction(e.new.id));
          } catch {
            /* se reintenta en el siguiente cambio */
          }
        })
        .subscribe();
      return () => sb.removeChannel(channel);
    },

    /* ---------- Cuentas ---------- */
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        // Supabase recomienda no llamar a la API dentro de este callback: se difiere.
        setTimeout(async () => {
          let profile = null;
          if (session) {
            try {
              profile = await loadProfile(session.user.id);
            } catch {
              profile = null;
            }
          }
          cb(session, profile, event);
        }, 0);
      });
      return () => data.subscription.unsubscribe();
    },
    async signIn(email, password) {
      must(await sb.auth.signInWithPassword({ email, password }));
    },
    async signUp(email, password) {
      const data = must(await sb.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } }));
      return { needsConfirmation: !data.session };
    },
    async signOut() {
      must(await sb.auth.signOut());
    },
    async resetPassword(email) {
      must(await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin }));
    },
    async updatePassword(password) {
      must(await sb.auth.updateUser({ password }));
    },
    async saveProfile(userId, profile) {
      return toProfile(must(await sb.from("profiles").update(pick(profile, PROFILE_FIELDS)).eq("id", userId).select().single()));
    },
  };
}
