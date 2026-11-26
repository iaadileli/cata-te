// Prueba la unión local ⇄ nube con una «nube» de mentira y varios dispositivos.  npm run sincro
import { fusionar } from "../sincro.js";
let fallos = 0; const ok = (c, t) => { console.log((c ? "  ✓ " : "  ✗ ") + t); if (!c) fallos++; };
const valida = o => (o && typeof o.id === "string" && o.clase !== "aceite" ? { ...o } : null);
const nube = new Map();
const disp = () => ({ local: [], tumbas: {} });
function sinc(d) { const r = fusionar(d.local, d.tumbas, [...nube.values()], valida); d.local = r.local; d.tumbas = r.tumbas; for (const o of r.subir) nube.set(o.id, structuredClone(o)); return r; }
const ids = d => d.local.map(o => o.id).sort().join(",");
const movil = disp(), ipad = disp(), mac = disp();

mac.local = [{ id: "a", te: "Oolong", creado: 10 }, { id: "b", te: "Negro", creado: 11 }];
let r = sinc(mac); ok(r.subir.length === 2 && nube.size === 2, "primera vez: sube lo que ya había");
r = sinc(mac); ok(!r.subir.length && !r.cambiado, "segunda vez: nada que hacer");
sinc(movil); ok(ids(movil) === "a,b", "otro dispositivo las recibe");

movil.local.find(o => o.id === "a").te = "Oolong (editado)"; movil.local.find(o => o.id === "a").creado = 20; sinc(movil); sinc(mac);
ok(mac.local.find(o => o.id === "a").te === "Oolong (editado)", "una edición llega a los demás");

mac.local.find(o => o.id === "b").creado = 30; mac.local.find(o => o.id === "b").te = "mac"; ipad.local = [{ id: "b", te: "ipad", creado: 25 }];
sinc(ipad); sinc(mac); sinc(ipad); ok(ipad.local.find(o => o.id === "b").te === "mac" && nube.get("b").te === "mac", "dos ediciones a la vez: gana la más reciente");

mac.local = mac.local.filter(o => o.id !== "a"); mac.tumbas.a = 40; sinc(mac);
ok(nube.get("a").borrado === true, "borrar sube el borrado"); sinc(movil); sinc(ipad); ok(ids(movil) === "b" && ids(ipad) === "b", "el borrado llega a los demás");

movil.local.push({ id: "c", te: "sin red", creado: 50 }); ok(!nube.has("c"), "sin conexión: se queda en local"); sinc(movil); sinc(mac); ok(ids(mac) === "b,c", "al volver la red se sube y llega");

ipad.local.push({ id: "c", te: "vieja", creado: 45 }); sinc(ipad); ok(ipad.local.find(o => o.id === "c").te === "sin red" && nube.get("c").te === "sin red", "una copia vieja no pisa a la nueva");

// borrado en un sitio y edición más reciente en otro: gana la edición
movil.local = movil.local.filter(o => o.id !== "c"); movil.tumbas.c = 60; mac.local.find(o => o.id === "c").creado = 70; mac.local.find(o => o.id === "c").te = "editada después";
sinc(movil); sinc(mac); sinc(movil); ok(movil.local.some(o => o.id === "c" && o.te === "editada después") && !nube.get("c").borrado, "editar después de que otro la borre: vuelve");
// y al revés: edición vieja frente a borrado nuevo
mac.local = mac.local.filter(o => o.id !== "c"); mac.tumbas.c = 90; ipad.local.find(o => o.id === "c").creado = 80; sinc(mac); sinc(ipad);
ok(!ipad.local.some(o => o.id === "c") && nube.get("c").borrado, "borrar después de una edición vieja: se borra");

nube.set("z", { id: "z", clase: "aceite", nombre: "x", creado: 1 }); r = sinc(ipad); ok(!ipad.local.some(o => o.id === "z") && !r.subir.length, "una cata que no vale no entra ni se vuelve a subir");
nube.set("q", { creado: 1 }); ok(!sinc(ipad).cambiado, "un documento roto se ignora");
const antes = JSON.stringify([...nube]); sinc(mac); sinc(movil); sinc(ipad); sinc(mac); ok(JSON.stringify([...nube]) === antes, "al final todos iguales y nada más que subir");
ok(ids(mac) === ids(movil) && ids(movil) === ids(ipad), `los tres dispositivos tienen lo mismo (${ids(mac)})`);
console.log(fallos ? `FALLOS: ${fallos}` : "TODO OK"); process.exit(fallos ? 1 : 0);
