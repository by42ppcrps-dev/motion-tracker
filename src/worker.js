import { check } from "./parser.js";
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    if (u.pathname === "/api/check") {
      if (req.method !== "POST") return new Response("POST only", { status: 405 });
      const body = await req.text();
      if (body.length > 65536) return Response.json({ error: "Notes too long (64 KB max)" }, { status: 413 });
      let notes; try { notes = JSON.parse(body).notes; } catch { return Response.json({ error: "Send JSON {notes}" }, { status: 400 }); }
      return Response.json(check(notes ?? ""), { headers: { "cache-control": "no-store" } });
    }
    if (u.pathname === "/health") return Response.json({ name: "motion-tracker", version: "0.1.0", stores: "nothing" });
    return env.ASSETS.fetch(req);
  }
};
