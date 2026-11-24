// node test/probar.mjs            → prueba la carpeta local
// WEBKIT=1 añade WebKit (el 24-nov-2026 newPage() se quedaba colgado en el Mac)
// URL=https://… node test/probar.mjs → prueba la web publicada
import { chromium, webkit } from "playwright-core";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url))), out = path.join(root, "test/salida"); fs.mkdirSync(out, { recursive: true });
const MIME = { ".html": "text/html", ".json": "application/json", ".svg": "image/svg+xml", ".js": "text/javascript", ".png": "image/png" };
let URL_ = process.env.URL, srv, fallos = 0;
if (!URL_) { srv = http.createServer((q, s) => { let f = path.join(root, decodeURI(q.url.split("?")[0]).replace("/cata-te/", "/")); if (f.endsWith("/")) f += "index.html";
  fs.readFile(f, (e, d) => { s.writeHead(e ? 404 : 200, { "Content-Type": MIME[path.extname(f)] || "text/plain" }); s.end(d); }); }).listen(0); URL_ = `http://localhost:${srv.address().port}/cata-te/`; }
const ok = (c, t) => { console.log((c ? "  ✓ " : "  ✗ ") + t); if (!c) fallos++; };
const catas = p => p.evaluate(() => JSON.parse(localStorage.getItem("cata-te-v1") || "[]"));
const imp = async (p, data) => { await p.setInputFiles("#impf", { name: "x.json", mimeType: "application/json", buffer: Buffer.from(typeof data === "string" ? data : JSON.stringify(data)) }); await p.waitForTimeout(250); return p.textContent("#iomsg"); };
for (const [nom, mot] of [["Chromium", chromium], ["WebKit", webkit]].filter(x => process.env.WEBKIT || x[1] !== webkit)) {
  console.log(nom, URL_);
  const b = await mot.launch(mot === chromium ? { channel: "chromium" } : {}), ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 390, height: 844 } }), p = await ctx.newPage(), errs = [];
  p.on("pageerror", e => errs.push(e.message)); p.on("dialog", d => { errs.push("diálogo " + d.message()); d.dismiss(); });
  const r = await p.goto(URL_); ok(r.status() === 200, "carga (200)");
  await p.fill("#te", "Té <b>uno</b>"); await p.fill("#g", "5"); await p.click("text=Floral"); await p.click(".sw >> nth=2");
  await p.locator("#s-dulzor").fill("4"); await p.locator("#nota").fill("8"); await p.waitForTimeout(600);
  await p.reload(); ok(await p.inputValue("#te") === "Té <b>uno</b>" && (await p.textContent("#msg")) === "Borrador recuperado.", "recupera el borrador");
  await p.click("#save"); await p.waitForSelector(".entry");
  let a = await catas(p); ok(a.length === 1 && a[0].nota === "8" && a[0].dulzor === "4" && a[0].liquor === "Ámbar" && a[0].notas[0] === "Floral", "guarda");
  ok(await p.locator(".entry h3 b").count() === 0, "el HTML del nombre se escapa");
  await p.reload(); ok(await p.locator(".entry").count() === 1, "sigue tras recargar");
  const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#exp")]);
  const h = new Date(), fich = `cata-te-${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}.json`;
  ok(dl.suggestedFilename() === fich, "exporta " + dl.suggestedFilename());
  const exp = fs.readFileSync(await dl.path(), "utf8"); ok(JSON.stringify(JSON.parse(exp)) === JSON.stringify(a), "contenido exportado idéntico");
  ok((await imp(p, exp)).includes("0 nuevas, 0 actualizadas, 1 sin cambios") && (await catas(p)).length === 1, "reimportar no duplica");
  await imp(p, [{ ...a[0], te: "Vieja", creado: 1 }]); ok((await catas(p))[0].te === a[0].te, "una versión más antigua no pisa");
  await imp(p, [{ ...a[0], te: "Nueva", creado: a[0].creado + 1000 }]); ok((await catas(p))[0].te === "Nueva", "la más reciente gana");
  await imp(p, [{ ...a[0], id: "otra", te: "Otra" }]); ok((await catas(p)).length === 2 && await p.locator(".entry").count() === 2, "id nuevo se añade y se ve");
  const antes = JSON.stringify(await catas(p));
  for (const [t, d] of [["texto", "hola"], ["objeto", {}], ["null", "null"], ["número", [1]], ["sin id", [{ te: "x" }]], ["sin té", [{ id: "x" }]], ["notas mal", [{ id: "x", te: "x", notas: "a" }]], ["creado mal", [{ id: "x", te: "x", creado: "hoy" }]], ["una buena y una mala", [{ id: "q", te: "q" }, 3]]]) {
    const m = await imp(p, d); ok(m.includes("No se ha importado nada") && JSON.stringify(await catas(p)) === antes, `rechaza ${t}: ${m}`); }
  await imp(p, [{ id: "min", te: "Mínima" }]); await p.locator('[data-id=min] [data-a=edit]').click(); await p.waitForSelector("#f:visible");
  ok(await p.inputValue("#nota") === "6", "abrir una cata importada incompleta"); await p.fill("#te", "Editada"); await p.click("#save"); await p.waitForSelector(".entry:visible");
  a = await catas(p); ok(a.length === 3 && a.find(x => x.id === "min").te === "Editada", "editar no duplica");
  await p.locator("[data-id=min] [data-a=del]").click(); await p.locator("[data-id=min] [data-a=del]").click(); ok((await catas(p)).length === 2, "borra");
  // Las demás clases
  await p.goto(URL_ + "#te/nueva"); await p.fill("#te", "Borrador de té"); 
  for (const [c, n] of [["vino", "Vino"], ["cafe", "Café"], ["aceite", "Aceite de oliva"]]) {
    await p.locator(`#clases [data-c=${c}]`).click(); await p.waitForTimeout(80); await p.click("nav a >> nth=0"); await p.waitForSelector("#f:visible"); await p.fill("#nombre", "Prueba " + n);
    const chips = p.locator("#pasos .chip"); for (let i = 0; i < await chips.count(); i++) await chips.nth(i).click();
    await p.locator(".sw").nth(3).click(); for (const s of await p.locator("#sliders input").all()) await s.fill("3");
    for (const t of await p.locator("#pasos input:not([type]):not(#nombre), #pasos textarea").all()) await t.fill("txt");
    for (const t of await p.locator("#pasos select").all()) await t.selectOption({ index: 1 });
    for (const t of await p.locator("#pasos input[type=number]").all()) await t.fill((await t.getAttribute("min")) === "1900" ? "2020" : "10");
    const vacios = await p.evaluate(() => [...document.querySelectorAll("#pasos [name]")].filter(x => !x.value && x.type !== "date").map(x => x.name)); ok(!vacios.length, `${n}: todos los campos se rellenan ${vacios}`);
    ok(await p.evaluate(() => { const i = [...document.querySelectorAll("[id]")].map(x => x.id); return new Set(i).size === i.length; }), `${n}: sin id repetidos`);
    const bien = await p.evaluate(() => [...document.querySelectorAll("#pasos input")].every(x => x.validity.valid)); ok(bien, `${n}: campos válidos`);
    await p.waitForTimeout(500); await p.reload(); ok(await p.inputValue("#nombre") === "Prueba " + n, `${n}: borrador propio`);
    const antes = await p.evaluate(() => JSON.stringify(read0()), await p.evaluate(() => { window.read0 = () => [...document.querySelectorAll("#pasos [name]")].map(x => x.value); }));
    await p.click("#save"); await p.waitForSelector(".entry:visible"); ok(await p.locator(".entry").count() === 1 && (await p.textContent("#count")) === "(1)", `${n}: guarda y lista solo las suyas`);
    const g = (await catas(p)).find(x => x.clase === c); ok(g && g.liquor && Object.values(g).every(v => !Array.isArray(v) || v.length), `${n}: todo guardado`);
    await p.evaluate(() => { window.__t = ""; Object.defineProperty(navigator, "clipboard", { value: { writeText: async t => { window.__t = t; } }, configurable: true }); });
    await p.locator("[data-a=copy]").click(); await p.waitForTimeout(50); const t = await p.evaluate(() => window.__t); ok(t.startsWith("Prueba " + n) && !/undefined|\[object/.test(t), `${n}: copiar texto`); if (process.env.VER) console.log(t);
    await p.locator("[data-a=edit]").click(); await p.waitForSelector("#f:visible"); ok(await p.evaluate(() => JSON.stringify(read0())) === antes, `${n}: abrir devuelve lo mismo`);
    await p.click("#save"); await p.waitForSelector(".entry:visible"); ok((await catas(p)).filter(x => x.clase === c).length === 1, `${n}: editar no duplica`);
    await p.click("nav a >> nth=2"); await p.waitForTimeout(50); ok(await p.locator("#v-guia .step").count() === 7 && (await p.textContent("h1")) === "Cuaderno de cata de " + n.toLowerCase(), `${n}: guía`);
    for (const v of ["nueva", "guia"]) { await p.goto(URL_ + `#${c}/${v}`); await p.waitForTimeout(150); ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${n}: ${v} sin desbordes`); await p.screenshot({ path: `${out}/${nom}-${c}-${v}.png`, fullPage: true }); } }
  const todo = await catas(p), bak = JSON.stringify(todo); const [d2] = await Promise.all([p.waitForEvent("download"), p.goto(URL_ + "#vino/catas").then(() => p.click("#exp"))]); ok(JSON.parse(fs.readFileSync(await d2.path(), "utf8")).length === 5, "exporta todas las clases");
  ok((await imp(p, bak)).includes("0 nuevas, 0 actualizadas, 5 sin cambios"), "reimporta todas");
  await p.evaluate(() => localStorage.removeItem("cata-te-v1")); await p.reload(); await imp(p, bak); ok(JSON.stringify((await catas(p)).map(x => Object.entries(x).sort()).sort()) === JSON.stringify(todo.map(x => Object.entries(x).sort()).sort()), "ida y vuelta sin perder datos");
  ok((await imp(p, [{ id: "z", nombre: "z", clase: "toString" }])).includes("No se ha importado nada"), "rechaza clase desconocida");
  await p.goto(URL_ + "#te/nueva"); await p.waitForTimeout(80); ok(await p.inputValue("#te") === "Borrador de té", "el borrador de té no se pierde al cambiar de clase"); await p.click("#reset");
  await p.evaluate(() => localStorage.setItem("cata-te-v1", JSON.stringify(JSON.parse(localStorage.getItem("cata-te-v1")).filter(x => !x.clase)))); await p.reload();
  // Dispositivo nuevo
  const c2 = await b.newContext(), q = await c2.newPage(); await q.goto(URL_ + "#catas"); await imp(q, await p.evaluate(() => localStorage.getItem("cata-te-v1")));
  ok(await q.locator(".entry").count() === 2, "importa en un navegador vacío"); await c2.close();
  // localStorage bloqueado
  const c3 = await b.newContext(), z = await c3.newPage(), e3 = []; z.on("pageerror", e => e3.push(e.message));
  await z.addInitScript(() => Object.defineProperty(window, "localStorage", { get() { throw new DOMException("no", "SecurityError"); } }));
  await z.goto(URL_); await z.fill("#te", "x"); await z.click("#save"); await z.waitForTimeout(200);
  ok(!e3.length && (await z.textContent("#msg")).startsWith("No se ha podido guardar") && await z.inputValue("#te") === "x", "sin localStorage: avisa y no pierde lo escrito"); await c3.close();
  if (mot === chromium) {
    await p.evaluate(() => navigator.serviceWorker.ready); await p.evaluate(async () => { await caches.open("ajena-v1"); await caches.open("cata-te-v0"); });
    await p.reload(); await p.waitForTimeout(800); console.log("   cachés:", await p.evaluate(async () => [await caches.keys(), (await (await caches.open("cata-te-v1")).keys()).map(x => new URL(x.url).pathname)]));
    ok((await p.evaluate(() => caches.keys())).includes("ajena-v1"), "no toca cachés ajenas");
    await p.evaluate(() => caches.delete("cata-te-v1")); await p.reload(); await p.waitForTimeout(1500);
    await ctx.setOffline(true); await p.goto(URL_ + "?x=1"); ok((await p.textContent("h1")).startsWith("Cuaderno de cata de ") && (await catas(p)).length === 2, "abre sin conexión (tras borrar la caché otra web)");
    ok(await p.evaluate(async () => (await fetch("icon.svg")).ok && (await fetch("manifest.json")).ok), "icono y manifest sin conexión"); 
    await p.click("nav a >> nth=0"); await p.fill("#te", "Sin red"); await p.click("#save"); await p.waitForTimeout(200); ok((await catas(p)).length === 3, "guarda sin conexión"); await ctx.setOffline(false);
    const cdp = await ctx.newCDPSession(p); ok(!(await cdp.send("Page.getAppManifest")).errors.length, "manifest sin errores");
    const ie = (await cdp.send("Page.getInstallabilityErrors")).installabilityErrors.map(x => x.errorId); ok(!ie.filter(x => x !== "in-incognito").length, "instalable " + JSON.stringify(ie));
  }
  for (const cs of ["light", "dark"]) { await p.emulateMedia({ colorScheme: cs }); await p.goto(URL_ + "#catas"); await p.waitForTimeout(300); await p.screenshot({ path: `${out}/${nom}-${cs}.png` });
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${cs}: sin desbordes · fondo ${await p.evaluate(() => getComputedStyle(document.body).backgroundColor)}`); }
  ok(!errs.length, "sin errores ni alert " + errs.join()); await b.close();
}
// Fidelidad con el original, si se da
if (process.env.ORIGINAL) { const b = await chromium.launch({ channel: "chromium" });
  for (const cs of ["light", "dark"]) for (const w of [390, 1100]) for (const v of ["nueva", "guia"]) { const im = [], tx = [];
    for (const u of ["file://" + encodeURI(process.env.ORIGINAL), URL_]) { const c = await b.newContext({ colorScheme: cs, viewport: { width: w, height: 5000 }, serviceWorkers: "block" }), p = await c.newPage(); await p.goto(u + "#" + v); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
      // el selector de clases es lo único nuevo (y «licor» → «infusión», que pidió Adil)
      await p.evaluate(() => { document.querySelector("#clases")?.remove(); for (const h of document.querySelectorAll("h3")) if (h.lastChild.data === "Color del licor") h.lastChild.data = "Color de la infusión"; }); tx.push(await p.evaluate(() => document.body.innerText)); im.push((await p.screenshot()).toString("base64")); await c.close(); }
    ok(tx[0] === tx[1], `té, texto igual que el original: ${v} ${cs} ${w}`); ok(im[0] === im[1], `té, imagen igual que el original: ${v} ${cs} ${w}`); } await b.close(); }
srv?.close(); console.log(fallos ? `FALLOS: ${fallos}` : "TODO OK"); process.exit(fallos ? 1 : 0);
