// Uses Neon's serverless driver directly (the current, non-deprecated path — the old
// @vercel/postgres package was retired after Vercel Postgres moved fully to the Neon
// Marketplace integration). When you connect Neon to this project from the Vercel
// dashboard (Storage -> Marketplace -> Neon), it injects DATABASE_URL automatically.

let sqlClient = null;

async function getSql() {
  if (sqlClient) return sqlClient;
  if (!process.env.DATABASE_URL) return null;
  try {
    const { neon } = await import("@neondatabase/serverless");
    sqlClient = neon(process.env.DATABASE_URL);
    return sqlClient;
  } catch {
    return null;
  }
}

async function ensureTable(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS analyses (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT now(),
      type TEXT NOT NULL,
      lang TEXT NOT NULL,
      name TEXT,
      confidence TEXT,
      emergency BOOLEAN DEFAULT false
    );
  `;
}

// Never throws — a missing/unreachable database must never break the user-facing response.
export async function logAnalysis({ type, lang, name, confidence, emergency }) {
  try {
    const sql = await getSql();
    if (!sql) return;
    await ensureTable(sql);
    await sql`
      INSERT INTO analyses (type, lang, name, confidence, emergency)
      VALUES (${type}, ${lang}, ${name || null}, ${confidence || null}, ${Boolean(emergency)});
    `;
  } catch (err) {
    console.error("logAnalysis failed (non-fatal):", err?.message || err);
  }
}

// Returns null (not 0) on any failure, so callers can distinguish "no data yet" from "broken".
export async function getAnalysisCount() {
  try {
    const sql = await getSql();
    if (!sql) return null;
    await ensureTable(sql);
    const rows = await sql`SELECT COUNT(*)::int AS count FROM analyses;`;
    return rows[0]?.count ?? null;
  } catch (err) {
    console.error("getAnalysisCount failed (non-fatal):", err?.message || err);
    return null;
  }
}
