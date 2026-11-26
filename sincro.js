// Une las catas de este navegador con las de la cuenta. Sin Firebase dentro: así se puede probar sola.
// Regla: gana la versión con «creado» más reciente (se renueva al editar). Un borrado se guarda como
// {id, borrado:true, creado:cuándo} para que también llegue a los demás dispositivos.
//   local:   catas de este navegador
//   tumbas:  {id: cuándo se borró} en este navegador
//   remotos: todo lo que hay en la cuenta (catas y borrados)
//   valida:  comprueba una cata que llega de fuera (devuelve null si no vale)
// Devuelve lo que queda en local, las tumbas, lo que hay que subir y si ha cambiado algo en local.
export function fusionar(local, tumbas, remotos, valida) {
  const L = new Map(local.map(o => [o.id, o])), T = { ...tumbas }, R = new Map();
  const t = o => Number(o && o.creado) || 0;
  let cambiado = false;
  for (const r of remotos) {
    if (!r || typeof r.id !== "string") continue;
    R.set(r.id, r);
    const l = L.get(r.id);
    if (r.borrado === true) {
      if (l && t(l) <= t(r)) { L.delete(r.id); cambiado = true; }
      if ((T[r.id] || 0) < t(r)) T[r.id] = t(r);
      continue;
    }
    if ((T[r.id] || 0) >= t(r)) continue;              // aquí se borró después: se sube el borrado
    const v = valida(r);
    if (v && (!l || t(r) > t(l))) { L.set(r.id, v); delete T[r.id]; cambiado = true; }
  }
  const subir = [];
  for (const l of L.values()) { const r = R.get(l.id); if (!r || t(l) > t(r)) subir.push(l); }
  for (const [id, cuando] of Object.entries(T)) {
    if (L.has(id)) { delete T[id]; continue; }           // se volvió a guardar después de borrarla
    const r = R.get(id);
    if (!r || t(r) < cuando || (!r.borrado && t(r) <= cuando)) subir.push({ id, borrado: true, creado: cuando });
  }
  return { local: [...L.values()], tumbas: T, subir, cambiado };
}
