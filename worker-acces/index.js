// Worker d'accès à la webapp DSCG : comptes, sessions, journaux, console /prof.
// Secrets (côté Cloudflare, jamais dans le dépôt) : ADMIN_PASSWORD, HASH_SECRET.
// Variables : ALLOWED_ORIGINS (liste séparée par des virgules), APP_URL.
import CONSOLE_HTML from "./console.html";

const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha256 = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
async function hmac(secret, msg) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(msg)));
}
const same = (a, b) => {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};
const now = () => new Date().toISOString();
const inMs = (ms) => new Date(Date.now() + ms).toISOString();
const DAY = 86400000;
const randToken = () => { const b = new Uint8Array(32); crypto.getRandomValues(b); return hex(b); };
const collator = new Intl.Collator("fr", { ignorePunctuation: true, sensitivity: "base" });
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60000;

const json = (o, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

function corsHeaders(req, env) {
  const o = req.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const h = { Vary: "Origin" };
  if (allowed.includes("*") || (o && allowed.includes(o))) {
    h["Access-Control-Allow-Origin"] = allowed.includes("*") ? "*" : o;
    h["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type,Authorization";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}
async function readBody(req) {
  try { return JSON.parse((await req.text()) || "{}") || {}; } catch (_) { return {}; }
}
const clean = (s, n) => String(s == null ? "" : s).replace(/\s+/g, " ").trim().slice(0, n);

/* ---------- codes ---------- */
function codeProblem(c) {
  if (!/^\d{4}$/.test(c)) return "format";
  const d = [...c].map(Number);
  if (d.every((x) => x === d[0])) return "evident";
  const df = [d[1] - d[0], d[2] - d[1], d[3] - d[2]];
  if (df.every((x) => x === 1) || df.every((x) => x === -1)) return "evident";
  if (d[0] === d[2] && d[1] === d[3]) return "evident";
  if (d[0] === d[1] && d[2] === d[3]) return "evident";
  const n = +c;
  if (n >= 1970 && n <= 2010) return "evident";
  return null;
}
const codeHash = (env, id, code) => hmac(env.HASH_SECRET, "code:" + id + ":" + code);

/* ---------- sessions ---------- */
async function newSession(env, role, studentId, ttlMs) {
  const token = randToken();
  await env.DB.prepare("INSERT INTO sessions (token_hash, role, student_id, status, created_at, expires_at) VALUES (?,?,?,?,?,?)")
    .bind(await sha256(token), role, studentId, "active", now(), inMs(ttlMs)).run();
  return token;
}
function tokenOf(req, body) {
  const a = req.headers.get("Authorization") || "";
  if (a.startsWith("Bearer ")) return a.slice(7).trim();
  return clean(body && body.token, 80);
}
async function getSession(env, token) {
  if (!/^[a-f0-9]{64}$/.test(token || "")) return { ok: false, reason: "none" };
  const r = await env.DB.prepare(
    "SELECT s.role, s.status, s.expires_at, s.student_id, st.nom, st.classe FROM sessions s LEFT JOIN students st ON st.id = s.student_id WHERE s.token_hash = ?"
  ).bind(await sha256(token)).first();
  if (!r) return { ok: false, reason: "none" };
  if (r.status === "replaced") return { ok: false, reason: "replaced" };
  if (r.status !== "active") return { ok: false, reason: "revoked" };
  if (r.expires_at < now()) return { ok: false, reason: "expired" };
  if (r.role === "eleve" && !r.nom) return { ok: false, reason: "none" };
  return { ok: true, role: r.role, studentId: r.student_id, nom: r.nom, classe: r.classe };
}
const logConn = (env, st, type) =>
  env.DB.prepare("INSERT INTO connexions (student_id, nom, classe, ts, type) VALUES (?,?,?,?,?)").bind(st.id, st.nom, st.classe, now(), type).run();

/* ---------- limitation des essais (accès enseignant, par adresse) ---------- */
async function lockedMinutes(env, k) {
  const r = await env.DB.prepare("SELECT locked_until FROM throttle WHERE k = ?").bind(k).first();
  if (r && r.locked_until && r.locked_until > now()) return Math.ceil((Date.parse(r.locked_until) - Date.now()) / 60000);
  return 0;
}
async function throttleFail(env, k) {
  const r = await env.DB.prepare("SELECT fails FROM throttle WHERE k = ?").bind(k).first();
  let fails = ((r && r.fails) || 0) + 1, lock = null;
  if (fails >= MAX_FAILS) { lock = inMs(LOCK_MS); fails = 0; }
  await env.DB.prepare("INSERT INTO throttle (k, fails, locked_until) VALUES (?,?,?) ON CONFLICT(k) DO UPDATE SET fails = excluded.fails, locked_until = excluded.locked_until")
    .bind(k, fails, lock).run();
  return lock ? 0 : MAX_FAILS - fails;
}

/* ---------- routes ---------- */
async function route(req, env, url) {
  const p = url.pathname.replace(/\/+$/, "") || "/";
  const m = req.method;

  if (m === "GET" && p === "/prof") {
    return new Response(CONSOLE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex", "Referrer-Policy": "no-referrer" } });
  }
  if (!p.startsWith("/api/")) return new Response("Not found", { status: 404 });

  /* --- public : écran d'accueil --- */
  if (m === "GET" && p === "/api/classes") {
    const r = await env.DB.prepare("SELECT c.id FROM classes c WHERE EXISTS (SELECT 1 FROM students s WHERE s.classe = c.id) ORDER BY c.position, c.id").all();
    return json({ classes: r.results.map((x) => x.id) });
  }
  if (m === "GET" && p === "/api/eleves") {
    const classe = clean(url.searchParams.get("classe"), 30);
    const r = await env.DB.prepare("SELECT id, nom, code_hash IS NOT NULL AS actif FROM students WHERE classe = ?").bind(classe).all();
    const list = r.results.map((x) => ({ id: x.id, nom: x.nom, actif: !!x.actif })).sort((a, b) => collator.compare(a.nom, b.nom));
    return json({ eleves: list });
  }

  const b = m === "POST" ? await readBody(req) : {};

  if (m === "POST" && p === "/api/activation") {
    const id = +b.eleve_id, classe = clean(b.classe, 30), code = String(b.code || "");
    if (code !== String(b.confirmation || "")) return json({ error: "confirmation" }, 400);
    const pb = codeProblem(code);
    if (pb) return json({ error: pb }, 400);
    const st = await env.DB.prepare("SELECT id, nom, classe FROM students WHERE id = ? AND classe = ?").bind(id, classe).first();
    if (!st) return json({ error: "inconnu" }, 404);
    const res = await env.DB.prepare("UPDATE students SET code_hash = ?, activated_at = ?, fails = 0, locked_until = NULL WHERE id = ? AND code_hash IS NULL")
      .bind(await codeHash(env, id, code), now(), id).run();
    if (!res.meta.changes) return json({ error: "deja_actif" }, 409);
    await logConn(env, st, "activation");
    return json({ token: await newSession(env, "eleve", id, 90 * DAY), nom: st.nom });
  }

  if (m === "POST" && p === "/api/connexion") {
    const id = +b.eleve_id, classe = clean(b.classe, 30), code = String(b.code || "");
    const st = await env.DB.prepare("SELECT * FROM students WHERE id = ? AND classe = ?").bind(id, classe).first();
    if (!st) return json({ error: "inconnu" }, 404);
    if (!st.code_hash) return json({ error: "non_actif" }, 409);
    if (st.locked_until && st.locked_until > now()) {
      return json({ error: "verrouille", minutes: Math.ceil((Date.parse(st.locked_until) - Date.now()) / 60000) }, 423);
    }
    const ok = /^\d{4}$/.test(code) && same(await codeHash(env, id, code), st.code_hash);
    if (!ok) {
      let fails = st.fails + 1, lock = null;
      if (fails >= MAX_FAILS) { lock = inMs(LOCK_MS); fails = 0; }
      await env.DB.prepare("UPDATE students SET fails = ?, locked_until = ? WHERE id = ?").bind(fails, lock, id).run();
      await logConn(env, st, lock ? "verrouille" : "echec");
      return json(lock ? { error: "verrouille", minutes: 15 } : { error: "code_incorrect", restants: MAX_FAILS - fails }, lock ? 423 : 401);
    }
    await env.DB.prepare("UPDATE students SET fails = 0, locked_until = NULL WHERE id = ?").bind(id).run();
    const old = await env.DB.prepare("UPDATE sessions SET status = 'replaced' WHERE student_id = ? AND status = 'active'").bind(id).run();
    if (old.meta.changes) await logConn(env, st, "deconnexion_forcee");
    await logConn(env, st, "connexion");
    return json({ token: await newSession(env, "eleve", id, 90 * DAY), nom: st.nom });
  }

  if (m === "POST" && p === "/api/session") {
    const s = await getSession(env, tokenOf(req, b));
    if (!s.ok) return json({ ok: false, reason: s.reason });
    if (s.role === "prof") return json({ ok: true, role: "prof", nom: "Enseignant" });
    let vue = null;
    if (b.page) {
      const r = await env.DB.prepare("INSERT INTO consultations (student_id, nom, classe, page, titre, ts) VALUES (?,?,?,?,?,?)")
        .bind(s.studentId, s.nom, s.classe, clean(b.page, 120), clean(b.titre, 160), now()).run();
      vue = r.meta.last_row_id;
    }
    return json({ ok: true, role: "eleve", nom: s.nom, classe: s.classe, vue });
  }

  if (m === "POST" && p === "/api/fin") {
    const s = await getSession(env, tokenOf(req, b));
    if (s.ok && s.role === "eleve" && +b.vue) {
      const sec = Math.max(0, Math.min(1800, Math.round(+b.sec || 0)));
      await env.DB.prepare("UPDATE consultations SET duree = MAX(duree, ?) WHERE id = ? AND student_id = ?").bind(sec, +b.vue, s.studentId).run();
    }
    return json({ ok: true });
  }

  if (m === "POST" && p === "/api/deconnexion") {
    const t = tokenOf(req, b);
    if (/^[a-f0-9]{64}$/.test(t)) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(t)).run();
    return json({ ok: true });
  }

  /* --- enseignant --- */
  if (m === "POST" && p === "/api/prof/login") {
    const ip = req.headers.get("CF-Connecting-IP") || "?";
    const k = "prof:" + ip;
    const lock = await lockedMinutes(env, k);
    if (lock) return json({ error: "verrouille", minutes: lock }, 423);
    const ok = same(await sha256("pw:" + String(b.password || "")), await sha256("pw:" + env.ADMIN_PASSWORD));
    if (!ok) {
      const restants = await throttleFail(env, k);
      return json(restants ? { error: "mot_de_passe", restants } : { error: "verrouille", minutes: 15 }, restants ? 401 : 423);
    }
    await env.DB.prepare("DELETE FROM throttle WHERE k = ?").bind(k).run();
    await env.DB.prepare("DELETE FROM sessions WHERE expires_at < ? OR (status != 'active' AND created_at < ?)").bind(now(), inMs(-7 * DAY)).run();
    return json({ token: await newSession(env, "prof", null, 365 * DAY) });
  }

  if (p.startsWith("/api/prof/")) {
    const s = await getSession(env, tokenOf(req, b));
    if (!s.ok || s.role !== "prof") return json({ error: "non_autorise" }, 401);
    const DB = env.DB;

    if (m === "GET" && p === "/api/prof/etat") {
      const r = await DB.prepare(
        "SELECT st.id, st.nom, st.classe, st.activated_at, st.locked_until, " +
        "(SELECT COUNT(*) FROM sessions s WHERE s.student_id = st.id AND s.status = 'active' AND s.expires_at > ?) AS connecte, " +
        "(SELECT MAX(ts) FROM connexions c WHERE c.student_id = st.id AND c.type IN ('connexion','activation')) AS derniere " +
        "FROM students st"
      ).bind(now()).all();
      const eleves = r.results.sort((a, b) => collator.compare(a.classe, b.classe) || collator.compare(a.nom, b.nom));
      return json({ eleves, maintenant: now() });
    }
    if (m === "GET" && p === "/api/prof/journal") {
      const from = clean(url.searchParams.get("from"), 30) || "0000", to = clean(url.searchParams.get("to"), 30) || "9999", classe = clean(url.searchParams.get("classe"), 30);
      const args = [from, to, classe, classe];
      const conn = await DB.prepare("SELECT student_id, nom, classe, ts, type FROM connexions WHERE ts >= ? AND ts <= ? AND (? = '' OR classe = ?) ORDER BY ts DESC LIMIT 20000").bind(...args).all();
      const cons = await DB.prepare("SELECT student_id, nom, classe, page, titre, ts, duree FROM consultations WHERE ts >= ? AND ts <= ? AND (? = '' OR classe = ?) ORDER BY ts DESC LIMIT 20000").bind(...args).all();
      return json({ connexions: conn.results, consultations: cons.results });
    }
    if (m === "POST" && p === "/api/prof/ajout") {
      const nom = clean(b.nom, 80), classe = clean(b.classe, 30).toUpperCase();
      if (!nom || !classe) return json({ error: "champs" }, 400);
      await DB.prepare("INSERT OR IGNORE INTO classes (id, position) VALUES (?, (SELECT COALESCE(MAX(position),0)+1 FROM classes))").bind(classe).run();
      const r = await DB.prepare("INSERT OR IGNORE INTO students (nom, classe, created_at) VALUES (?,?,?)").bind(nom, classe, now()).run();
      return json({ ajoutes: r.meta.changes ? 1 : 0, ignores: r.meta.changes ? 0 : 1 });
    }
    if (m === "POST" && p === "/api/prof/import") {
      const classe = clean(b.classe, 30).toUpperCase();
      if (!classe) return json({ error: "champs" }, 400);
      const noms = [...new Set(String(b.texte || "").split(/\r?\n/).map((l) => clean(l.replace(/^\s*\d+\s*[.)\-]\s*/, ""), 80)).filter(Boolean))].slice(0, 400);
      await DB.prepare("INSERT OR IGNORE INTO classes (id, position) VALUES (?, (SELECT COALESCE(MAX(position),0)+1 FROM classes))").bind(classe).run();
      const rs = await DB.batch(noms.map((n) => DB.prepare("INSERT OR IGNORE INTO students (nom, classe, created_at) VALUES (?,?,?)").bind(n, classe, now())));
      const ajoutes = rs.reduce((a, r) => a + (r.meta.changes ? 1 : 0), 0);
      return json({ ajoutes, ignores: noms.length - ajoutes });
    }
    const id = +b.id;
    if (m === "POST" && p === "/api/prof/supprimer") {
      await DB.batch([DB.prepare("DELETE FROM sessions WHERE student_id = ?").bind(id), DB.prepare("DELETE FROM students WHERE id = ?").bind(id)]);
      return json({ ok: true });
    }
    if (m === "POST" && p === "/api/prof/reinit") {
      await DB.batch([
        DB.prepare("UPDATE students SET code_hash = NULL, activated_at = NULL, fails = 0, locked_until = NULL WHERE id = ?").bind(id),
        DB.prepare("UPDATE sessions SET status = 'revoked' WHERE student_id = ? AND status = 'active'").bind(id),
      ]);
      return json({ ok: true });
    }
    if (m === "POST" && p === "/api/prof/deconnecter") {
      await DB.prepare("UPDATE sessions SET status = 'revoked' WHERE student_id = ? AND status = 'active'").bind(id).run();
      return json({ ok: true });
    }
    if (m === "POST" && p === "/api/prof/debloquer") {
      await DB.prepare("UPDATE students SET fails = 0, locked_until = NULL WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }
    if (m === "POST" && p === "/api/prof/purge") {
      if (b.confirmation !== "PURGER") return json({ error: "confirmation" }, 400);
      await DB.batch(["consultations", "connexions", "sessions", "students", "classes", "throttle"].map((t) => DB.prepare("DELETE FROM " + t)));
      return json({ ok: true });
    }
    if (m === "POST" && p === "/api/prof/ouvrir") {
      const token = await newSession(env, "prof", null, 365 * DAY);
      return json({ url: (env.APP_URL || "") + "#prof=" + token });
    }
    if (m === "POST" && p === "/api/prof/logout") {
      const t = tokenOf(req, b);
      await DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(t)).run();
      return json({ ok: true });
    }
  }
  return json({ error: "introuvable" }, 404);
}

export default {
  async fetch(req, env) {
    const ch = corsHeaders(req, env);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: ch });
    let res;
    try { res = await route(req, env, new URL(req.url)); }
    catch (e) { res = json({ error: "serveur" }, 500); }
    for (const k in ch) res.headers.set(k, ch[k]);
    return res;
  },
};
