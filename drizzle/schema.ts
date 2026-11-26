import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const sites = mysqlTable("sites", {
  id: int("id").autoincrement().primaryKey(),
  codigoSubtel: varchar("codigoSubtel", { length: 10 }).notNull().unique(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  cliente: varchar("cliente", { length: 80 }).notNull(),
  tipo: varchar("tipo", { length: 60 }).notNull(),
  comuna: varchar("comuna", { length: 80 }).notNull(),
  plazo: varchar("plazo", { length: 10 }).notNull(),
  estado: varchar("estado", { length: 24 }).notNull().default("recibido"),
  equipo: varchar("equipo", { length: 60 }).notNull(),
  responsable: varchar("responsable", { length: 100 }).notNull(),
  dibujante: varchar("dibujante", { length: 100 }),
  revisionResultado: varchar("revisionResultado", { length: 16 }),
  observacion: text("observacion"),
  version: int("version").notNull().default(1),
  atraso: int("atraso").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const siteFiles = mysqlTable("siteFiles", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull(),
  tipo: varchar("tipo", { length: 16 }).notNull(),
  nombre: varchar("nombre", { length: 180 }).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  version: int("version").notNull().default(1),
  registradoPor: varchar("registradoPor", { length: 100 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const siteHistory = mysqlTable("siteHistory", {
  id: int("id").autoincrement().primaryKey(),
  siteId: int("siteId").notNull(),
  estadoAnterior: varchar("estadoAnterior", { length: 24 }),
  estadoNuevo: varchar("estadoNuevo", { length: 24 }).notNull(),
  accion: varchar("accion", { length: 40 }).notNull(),
  rol: varchar("rol", { length: 20 }).notNull(),
  actor: varchar("actor", { length: 100 }).notNull(),
  comentario: text("comentario"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Site = typeof sites.$inferSelect;
export type InsertSite = typeof sites.$inferInsert;
export type SiteFile = typeof siteFiles.$inferSelect;
export type SiteHistory = typeof siteHistory.$inferSelect;
