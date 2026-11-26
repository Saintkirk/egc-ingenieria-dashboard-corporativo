import { Router } from "express";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { siteFiles, siteHistory, sites } from "../drizzle/schema";

export const ESTADOS = ["Recibido", "Visita programada", "Visitado", "Informe cargado", "En dibujo", "Plano listo", "En revisión", "Aprobado", "Entregado", "Facturado"] as const;
const stateIndex = new Map(ESTADOS.map((estado, index) => [estado.toLowerCase().replaceAll(" ", "_"), index]));
stateIndex.set("en_revision", 6);
const ACTORES: Record<string, string> = { jefe: "Jefe de área", terreno: "Equipo A", dibujante: "Dibujante 2", revisor: "Revisor" };
const fileKinds = ["fotografias", "croquis", "informe", "plano"] as const;
type Role = keyof typeof ACTORES;

const seedSites = [
  { codigoSubtel: "0412", nombre: "Cerro Alegre", cliente: "Entel", tipo: "Proyección", comuna: "Valparaíso · Valparaíso", latitud: -33.0458, longitud: -71.6197, elevacion: 118, visitaProgramada: "2026-11-28", plazo: "28-11-2026", estado: "visita_programada", equipo: "Equipo A", responsable: "Equipo A", atraso: 0 },
  { codigoSubtel: "0388", nombre: "Lomas Norte", cliente: "WOM", tipo: "Levantamiento estructural", comuna: "Quilicura · Metropolitana", latitud: -33.3662, longitud: -70.7351, elevacion: 612, visitaProgramada: "2026-11-27", plazo: "25-11-2026", estado: "informe_cargado", equipo: "Equipo A", responsable: "Revisor", atraso: 1 },
  { codigoSubtel: "0431", nombre: "Valle Sur", cliente: "Entel", tipo: "Levantamiento fotográfico", comuna: "Maipú · Metropolitana", latitud: -33.5104, longitud: -70.7528, elevacion: 486, visitaProgramada: "2026-11-30", plazo: "30-11-2026", estado: "en_dibujo", equipo: "Equipo B", responsable: "Dibujante 2", dibujante: "Dibujante 2", atraso: 0 },
  { codigoSubtel: "0377", nombre: "Pampa Alta", cliente: "WOM", tipo: "Proyección", comuna: "Calama · Antofagasta", latitud: -22.4544, longitud: -68.9294, elevacion: 2260, visitaProgramada: "2026-11-26", plazo: "24-11-2026", estado: "visitado", equipo: "Contratista 1", responsable: "Contratista 1", atraso: 1 },
  { codigoSubtel: "0420", nombre: "Santa Rosa", cliente: "Entel", tipo: "Levantamiento estructural", comuna: "La Granja · Metropolitana", latitud: -33.5319, longitud: -70.6287, elevacion: 570, visitaProgramada: "2026-12-02", plazo: "02-12-2026", estado: "recibido", equipo: "Equipo A", responsable: "Jefe de área", atraso: 0 },
];

async function ensureSeed() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const existing = await db.select({ id: sites.id }).from(sites).limit(1);
  if (existing.length) {
    // Backfill seguro para bases creadas antes de incorporar geolocalización.
    for (const seed of seedSites) {
      const current = await db.select().from(sites).where(eq(sites.codigoSubtel, seed.codigoSubtel)).limit(1);
      if (current[0] && (!current[0].latitud || current[0].latitud === 0)) {
        await db.update(sites).set({ latitud: seed.latitud, longitud: seed.longitud, elevacion: seed.elevacion, visitaProgramada: seed.visitaProgramada }).where(eq(sites.id, current[0].id));
      }
    }
    return db;
  }
  for (const seed of seedSites) {
    const [created] = await db.insert(sites).values(seed).$returningId();
    const id = Number(created.id);
    const state = stateIndex.get(seed.estado) ?? 0;
    const files = state >= 3 ? ["fotografias", "croquis", "informe"] : [];
    if (state >= 4) files.push("plano");
    if (files.length) await db.insert(siteFiles).values(files.map(tipo => ({ siteId: id, tipo, nombre: `${tipo}-${seed.codigoSubtel}-v1.pdf`, url: `demo://egc/${seed.codigoSubtel}/${tipo}/v1`, version: 1, registradoPor: ACTORES[seed.equipo === "Equipo A" ? "terreno" : "jefe"] ?? "Jefe de área" })));
    await db.insert(siteHistory).values({ siteId: id, estadoNuevo: seed.estado, accion: "seed", rol: "jefe", actor: "Sistema demo", comentario: "Registro ficticio inicial" });
  }
  return db;
}

const fileMap = (files: Array<typeof siteFiles.$inferSelect>) => files.reduce<Record<string, boolean>>((out, file) => { out[file.tipo] = true; return out; }, {});
async function siteDto(db: any, site: typeof sites.$inferSelect) {
  const files = await db.select().from(siteFiles).where(eq(siteFiles.siteId, site.id));
  const history = await db.select().from(siteHistory).where(eq(siteHistory.siteId, site.id)).orderBy(desc(siteHistory.createdAt));
  const index = stateIndex.get(site.estado) ?? 0;
  return {
    id: site.codigoSubtel, dbId: site.id, nombre: site.nombre, cliente: site.cliente, tipo: site.tipo, comuna: site.comuna, plazo: site.plazo,
    latitud: site.latitud, longitud: site.longitud, elevacion: site.elevacion, visitaProgramada: site.visitaProgramada ?? site.plazo,
    estado: index, equipo: site.equipo, responsable: site.responsable, dibujante: site.dibujante ?? null, atraso: Boolean(site.atraso), observacion: site.observacion ?? null,
    revision: site.revisionResultado ? { resultado: site.revisionResultado, fecha: site.updatedAt } : null,
    evidencias: fileMap(files), archivos: files, historial: history.reverse().map((item: any) => ({ fecha: item.createdAt, texto: item.comentario || item.accion, estado: stateIndex.get(item.estadoNuevo) ?? null })),
  };
}

const siteByCode = async (db: any, code: string) => { const rows = await db.select().from(sites).where(eq(sites.codigoSubtel, code)).limit(1); return rows[0]; };
function own(role: Role, site: typeof sites.$inferSelect) { return role === "terreno" ? site.equipo === ACTORES.terreno : role === "dibujante" ? site.dibujante === ACTORES.dibujante : true; }
function requirements(db: any, siteId: number) { return db.select().from(siteFiles).where(eq(siteFiles.siteId, siteId)); }

async function transition(code: string, action: string, role: Role, comment = "") {
  const db = await ensureSeed(); const site = await siteByCode(db, code); if (!site) return { ok: false, error: "Sitio inexistente." };
  if (!own(role, site)) return { ok: false, error: role === "terreno" ? `El sitio pertenece a ${site.equipo}, no a tu equipo.` : "El sitio no está asignado a ti." };
  const files = await requirements(db, site.id); const has = (type: string) => files.some((file: any) => file.tipo === type);
  const current = stateIndex.get(site.estado) ?? 0;
  const allowed: Record<string, { from: number[]; to: string; roles: Role[] }> = {
    programar: { from: [0], to: "visita_programada", roles: ["jefe"] }, visita: { from: [1], to: "visitado", roles: ["jefe", "terreno"] },
    informe: { from: [2], to: "informe_cargado", roles: ["jefe", "terreno"] }, dibujante: { from: [3], to: "en_dibujo", roles: ["jefe"] },
    plano: { from: [4], to: "plano_listo", roles: ["jefe", "dibujante"] }, enviar_revision: { from: [5], to: "en_revision", roles: ["jefe"] },
    entregar: { from: [7], to: "entregado", roles: ["jefe"] }, facturar: { from: [8], to: "facturado", roles: ["jefe"] },
  };
  const rule = allowed[action]; if (!rule || !rule.roles.includes(role)) return { ok: false, error: "Tu rol no puede ejecutar esta acción." };
  if (!rule.from.includes(current)) return { ok: false, error: `La acción requiere un estado válido; el sitio está en «${ESTADOS[current]}».` };
  // La acción "informe" representa la carga transaccional de las tres evidencias de terreno.
  if (action === "plano" && !has("plano")) await db.insert(siteFiles).values({ siteId: site.id, tipo: "plano", nombre: `plano-${code}-v1.pdf`, url: `demo://egc/${code}/plano/v1`, version: 1, registradoPor: ACTORES[role] });
  if (action === "informe") { for (const tipo of ["fotografias", "croquis", "informe"]) if (!has(tipo)) await db.insert(siteFiles).values({ siteId: site.id, tipo, nombre: `${tipo}-${code}-v1.pdf`, url: `demo://egc/${code}/${tipo}/v1`, version: 1, registradoPor: ACTORES[role] }); }
  if (action === "dibujante") site.dibujante = ACTORES.dibujante;
  const next = rule.to; await db.update(sites).set({ estado: next, responsable: ACTORES[role], dibujante: site.dibujante, updatedAt: new Date() }).where(eq(sites.id, site.id));
  await db.insert(siteHistory).values({ siteId: site.id, estadoAnterior: site.estado, estadoNuevo: next, accion: action, rol: role, actor: ACTORES[role], comentario: comment || `Acción ${action} ejecutada` });
  return { ok: true, sitio: await siteDto(db, (await siteByCode(db, code))!) };
}

export const demoRouter = Router();
demoRouter.get("/snapshot", async (_req, res) => { try { const db = await ensureSeed(); const rows = await db.select().from(sites); res.json({ ok: true, sitios: await Promise.all(rows.map(site => siteDto(db, site))), source: "database" }); } catch (error) { res.status(503).json({ ok: false, error: String(error) }); } });
demoRouter.post("/sites", async (req, res) => { try { const db = await ensureSeed(); const { id, nombre } = req.body; const plazo = String(req.body.plazo || "2026-12-05"); const [yyyy, mm, dd] = plazo.split("-"); if (!/^\\d{4}$/.test(id) || !nombre) return res.status(400).json({ ok: false, error: "Código de cuatro dígitos y nombre son obligatorios." }); if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(plazo) || !yyyy || !mm || !dd) return res.status(400).json({ ok: false, error: "El plazo debe tener formato AAAA-MM-DD." }); if (await siteByCode(db, id)) return res.status(409).json({ ok: false, error: "Ya existe un sitio con ese código." }); const [created] = await db.insert(sites).values({ codigoSubtel: id, nombre, cliente: "Entel", tipo: "Levantamiento estructural", comuna: "Puente Alto · Metropolitana", plazo: `${dd}-${mm}-${yyyy}`, visitaProgramada: plazo, estado: "recibido", equipo: "Equipo A", responsable: "Jefe de área" }).$returningId(); await db.insert(siteHistory).values({ siteId: Number(created.id), estadoNuevo: "recibido", accion: "crear", rol: "jefe", actor: ACTORES.jefe, comentario: "Jefe registró la asignación" }); res.status(201).json({ ok: true, sitio: await siteDto(db, (await siteByCode(db, id))!) }); } catch (error) { res.status(500).json({ ok: false, error: String(error) }); } });
demoRouter.post("/sites/:code/actions", async (req, res) => { try { const result = await transition(req.params.code, req.body.action, req.body.role, req.body.comment); res.status(result.ok ? 200 : 409).json(result); } catch (error) { res.status(500).json({ ok: false, error: String(error) }); } });
demoRouter.post("/sites/:code/reschedule", async (req, res) => { try { const db = await ensureSeed(); const site = await siteByCode(db, req.params.code); const date = String(req.body.fecha || ""); if (!site) return res.status(404).json({ ok: false, error: "Sitio inexistente." }); if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ ok: false, error: "La fecha debe tener formato AAAA-MM-DD." }); await db.update(sites).set({ visitaProgramada: date, updatedAt: new Date() }).where(eq(sites.id, site.id)); await db.insert(siteHistory).values({ siteId: site.id, estadoAnterior: site.estado, estadoNuevo: site.estado, accion: "reagendar_visita", rol: "jefe", actor: ACTORES.jefe, comentario: `Visita reagendada para ${date}` }); res.json({ ok: true, sitio: await siteDto(db, (await siteByCode(db, req.params.code))!) }); } catch (error) { res.status(500).json({ ok: false, error: String(error) }); } });
demoRouter.post("/sites/:code/review", async (req, res) => { try { const db = await ensureSeed(); const site = await siteByCode(db, req.params.code); if (!site) return res.status(404).json({ ok: false, error: "Sitio inexistente." }); if (req.body.role !== "revisor" || site.estado !== "en_revision") return res.status(409).json({ ok: false, error: "Solo el revisor puede dictaminar un sitio en revisión." }); const files = await requirements(db, site.id); if (!["fotografias", "croquis", "informe", "plano"].every(type => files.some((file: any) => file.tipo === type))) return res.status(409).json({ ok: false, error: "La revisión requiere las cuatro evidencias." }); const approved = req.body.resultado === "aprobar"; const next = approved ? "aprobado" : "visitado"; await db.update(sites).set({ estado: next, revisionResultado: approved ? "aprobado" : "observado", observacion: approved ? null : req.body.comment || "Observación del revisor", responsable: approved ? ACTORES.jefe : site.equipo, updatedAt: new Date() }).where(eq(sites.id, site.id)); await db.insert(siteHistory).values({ siteId: site.id, estadoAnterior: site.estado, estadoNuevo: next, accion: approved ? "aprobar" : "observar", rol: "revisor", actor: ACTORES.revisor, comentario: approved ? "Revisor aprobó el plano" : req.body.comment }); res.json({ ok: true, sitio: await siteDto(db, (await siteByCode(db, req.params.code))!) }); } catch (error) { res.status(500).json({ ok: false, error: String(error) }); } });
