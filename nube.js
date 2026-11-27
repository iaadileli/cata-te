// Guardar las catas en la cuenta de Google (Firebase) para tenerlas en todos los dispositivos.
// Este navegador sigue teniendo su copia (localStorage): sin conexión todo funciona igual y se sube al volver la red.
// En la nube: users/{uid}/catas/{id}. Las reglas de Firestore solo dejan a cada cuenta leer y escribir lo suyo.
import { fusionar } from "./sincro.js";

const CFG = {
  apiKey: "AIzaSyB_3fhswfaV-PF5uyQ6J67WygMItCOAz3o",
  authDomain: "cuaderno-de-catas-8c3a5.firebaseapp.com",
  projectId: "cuaderno-de-catas-8c3a5",
  storageBucket: "cuaderno-de-catas-8c3a5.firebasestorage.app",
  messagingSenderId: "638532234053",
  appId: "1:638532234053:web:b71342b3cc6071924f6c2c"
};
const TB = "cata-te-borradas", DU = "cata-te-dueno";
const api = window.catasAPI;
const ls = { get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

let cargado = false, F = null, auth = null, db = null, user = null, remotos = null, parar = null, pendiente = false, error = "";

// Estado que se pinta en .cuenta (portada y «Mis catas»)
function pintar() {
  const em = document.getElementById("entrada-msg");
  if (em) em.innerHTML = error ? `<span class="aviso">${esc(error)}</span>` : !F && cargado ? `<span class="aviso">Ahora no se puede entrar (¿sin conexión?). Puedes continuar sin entrar.</span>` : "Sin entrar, las catas se quedan solo en este navegador.";
  for (const el of document.querySelectorAll(".cuenta")) {
    const corta = el.dataset.corta != null;
    if (!F) { el.innerHTML = corta ? "" : `<span class="msg">Tus catas se guardan en este navegador. Exporta de vez en cuando para tener copia.</span>`; continue; }
    if (!user) {
      el.innerHTML = corta
        ? `<button type="button" class="enlace" data-nube="entrar">Entrar para guardar en tu cuenta</button>`
        : `<span class="msg">Ahora tus catas están solo en este navegador. Entra con tu cuenta de Google y las tendrás en el móvil, el iPad y el ordenador.</span><button type="button" class="btn" data-nube="entrar">Entrar con Google</button>`;
    } else {
      const est = error ? `<span class="aviso">${esc(error)}</span>` : remotos == null ? "Conectando…" : pendiente ? "Guardado aquí; se subirá al volver la conexión" : "Sincronizado";
      el.innerHTML = corta
        ? `<span class="msg">☁︎ ${esc(user.email || "")}</span>`
        : `<span class="msg">☁︎ Guardadas en tu cuenta <b>${esc(user.email || "")}</b> · ${est}</span> <button type="button" class="btn" data-nube="salir">Salir</button>`;
    }
    if (error && !user) el.insertAdjacentHTML("beforeend", ` <span class="aviso">${esc(error)}</span>`);
  }
}
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Une local y nube, guarda lo que cambie aquí y sube lo que falte allí.
function sincronizar() {
  if (!user || remotos == null) return;
  const r = fusionar(api.local(), ls.get(TB, {}), remotos, api.check);
  if (r.cambiado) { const e = api.saveLocal(r.local); if (e) { error = e; pintar(); return; } }
  ls.set(TB, r.tumbas);
  if (r.cambiado) api.refrescar();
  for (const o of r.subir) F.setDoc(F.doc(db, "users", user.uid, "catas", o.id), JSON.parse(JSON.stringify(o)))
    .catch(e => { error = "No se ha podido subir: " + (e.code || e.message); pintar(); });
}

function escuchar() {
  parar?.(); remotos = null; pendiente = false; error = "";
  parar = F.onSnapshot(F.collection(db, "users", user.uid, "catas"), { includeMetadataChanges: true }, snap => {
    pendiente = snap.metadata.hasPendingWrites;
    // la primera foto sacada solo de la caché puede estar vacía o vieja: se espera a la del servidor si hay red
    if (snap.metadata.fromCache && remotos == null && navigator.onLine) { pintar(); return; }
    remotos = snap.docs.map(d => d.data()); error = ""; sincronizar(); pintar();
  }, e => { error = "No se puede leer la cuenta: " + (e.code || e.message); pintar(); });
}

async function entrar() {
  error = ""; pintar();
  const p = new F.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" });
  try { await F.signInWithPopup(auth, p); }
  catch (e) {
    if (["auth/popup-blocked", "auth/operation-not-supported-in-this-environment", "auth/cancelled-popup-request"].includes(e.code)) { try { await F.signInWithRedirect(auth, p); return; } catch (e2) { e = e2; } }
    if (e.code !== "auth/popup-closed-by-user") { error = "No se ha podido entrar: " + (e.code || e.message); pintar(); }
  }
}

async function salir() {
  if (!navigator.onLine) { error = "Sin conexión: conéctate antes de salir para no perder nada."; pintar(); return; }
  try { await Promise.race([F.waitForPendingWrites(db), new Promise((_, no) => setTimeout(() => no(new Error("tarda")), 15000))]); }
  catch (e) { error = "Aún hay catas sin subir. Inténtalo en un momento."; pintar(); return; }
  await F.signOut(auth);
  // Las catas ya están en la cuenta: este navegador se queda vacío para que otra persona no las vea.
  api.vaciar(); try { localStorage.removeItem(TB); localStorage.removeItem(DU); } catch (e) {}
}

let avisarListo; const listo = new Promise(r => { avisarListo = r; });
document.addEventListener("click", async e => {
  const b = e.target.closest("[data-nube=entrar],[data-nube=salir]"); if (!b) return;
  if (!cargado) await listo;   // si pulsas antes de que acabe de cargar Firebase, espera
  if (!F) { error = "Ahora no se puede entrar (¿sin conexión?). Puedes continuar sin entrar."; pintar(); return; }
  b.dataset.nube === "entrar" ? entrar() : salir();
});

try {
  F = await import("./vendor/firebase.js");
  const app = F.initializeApp(CFG);
  auth = F.getAuth(app);
  db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  F.getRedirectResult(auth).catch(e => { error = "No se ha podido entrar: " + (e.code || e.message); pintar(); });
  F.onAuthStateChanged(auth, u => {
    user = u;
    // la pantalla de entrada: fuera si has entrado; vuelve si sales (salvo que hayas elegido seguir sin cuenta)
    let sin = false; try { sin = !!sessionStorage.getItem("cata-te-sin-cuenta"); } catch (e) {}
    if (u) delete document.documentElement.dataset.entrada; else if (!sin) document.documentElement.dataset.entrada = "1";
    if (!u) { parar?.(); parar = null; remotos = null; pintar(); return; }
    // Si este navegador tenía las catas de otra cuenta, se vacía antes de unir (esas ya están en su cuenta).
    const d = ls.get(DU, null);
    if (d && d !== u.uid) { api.vaciar(); try { localStorage.removeItem(TB); } catch (e) {} }
    ls.set(DU, u.uid);
    escuchar(); pintar();
  });
  // Cada vez que se guarda, se edita, se borra o se importa algo aquí.
  window.nube = { cambio: sincronizar };
  addEventListener("storage", e => { if (e.key === TB) sincronizar(); });
} catch (e) { F = null; console.warn("Nube no disponible", e); }
cargado = true; avisarListo(); pintar();
