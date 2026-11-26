// Sustituye a vendor/firebase.js en las pruebas: misma forma, pero la «nube» vive en Node (window.__nubeLeer/__nubeEscribir).
let user = JSON.parse(sessionStorage.getItem("__user") || "null"); const obs = [];  // como Firebase: la sesión sobrevive a recargar
export const initializeApp = c => ({ c });
export const getAuth = () => ({});
export class GoogleAuthProvider { setCustomParameters() {} }
export const signInWithPopup = async () => { if (window.__popupFalla) throw Object.assign(new Error("x"), { code: window.__popupFalla }); user = { uid: window.__uid || "adil", email: (window.__uid || "adil") + "@gmail.com" }; sessionStorage.setItem("__user", JSON.stringify(user)); obs.forEach(f => f(user)); };
export const signInWithRedirect = async () => { window.__redirect = true; };
export const getRedirectResult = async () => null;
export const onAuthStateChanged = (a, f) => { obs.push(f); setTimeout(() => f(user)); return () => {}; };
export const signOut = async () => { user = null; sessionStorage.removeItem("__user"); obs.forEach(f => f(null)); };
export const initializeFirestore = () => ({});
export const persistentLocalCache = () => ({}); export const persistentMultipleTabManager = () => ({});
export const collection = (db, ...p) => p.join("/"); export const doc = (db, ...p) => p.join("/");
export const setDoc = async (ruta, data) => { if (navigator.onLine === false || window.__sinRed) { window.__pend = (window.__pend || []).concat([[ruta, data]]); return; } await window.__nubeEscribir(ruta, data); };
export const waitForPendingWrites = async () => { for (const [r, d] of window.__pend || []) await window.__nubeEscribir(r, d); window.__pend = []; };
export const onSnapshot = (ruta, o, f) => { let vivo = true; const t = async () => { if (!vivo) return; if (!window.__sinRed) { for (const [r, d] of window.__pend || []) await window.__nubeEscribir(r, d); window.__pend = []; const docs = await window.__nubeLeer(ruta); f({ metadata: { hasPendingWrites: !!(window.__pend || []).length, fromCache: false }, docs: docs.map(d => ({ data: () => d })) }); } setTimeout(t, 150); }; t(); return () => { vivo = false; }; };
