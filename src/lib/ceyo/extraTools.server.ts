import { z } from "zod";
import { publicBrowserUrl } from "@/lib/computer/browserRules";
import type { AgentTool } from "./toolSchemas";
import { tool } from "./toolSchemas";

/** Extra general-purpose agent tools: public HTTP/APIs, Telegram Bot API and keyless data sources. */
const str = { type: "string" };
const clip = (s: string, n = 15000) => (s.length > n ? `${s.slice(0, n)}\n…[truncated]` : s);
async function getJson(url: string) {
  const r = await fetch(url, { headers: { "User-Agent": "CeyoAgent/1.0", Accept: "application/json" } });
  if (!r.ok) throw new Error(`Request failed (${r.status})`);
  return r.json();
}

export function extraTools(): AgentTool[] {
  const list: AgentTool[] = [];
  const add = (name: string, description: string, props: object, required: string[], run: AgentTool["run"]) => list.push({ name, def: tool(name, description, props, required), run });

  add("http_request", "Call ANY public HTTP API or URL (GET/POST/PUT/PATCH/DELETE) with headers and JSON/text body; returns status, headers and body. Use it to act through external services' APIs yourself instead of telling the user to do it.", { url: str, method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE"] }, headers: { type: "object" }, body: { type: "string", description: "Request body; JSON text for APIs" } }, ["url"], async (args) => {
    const input = z.object({ url: z.string().url(), method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("GET"), headers: z.record(z.string()).optional(), body: z.unknown().optional() }).parse(args);
    const url = publicBrowserUrl(input.url);
    const headers: Record<string, string> = { "User-Agent": "CeyoAgent/1.0", ...(input.headers || {}) };
    let body: string | undefined;
    if (input.body !== undefined && input.method !== "GET") {
      body = typeof input.body === "string" ? input.body : JSON.stringify(input.body);
      if (typeof input.body !== "string" && !Object.keys(headers).some((h) => h.toLowerCase() === "content-type")) headers["Content-Type"] = "application/json";
    }
    const r = await fetch(url, { method: input.method, headers, body, redirect: "follow" });
    const text = await r.text();
    return JSON.stringify({ status: r.status, ok: r.ok, content_type: r.headers.get("content-type"), body: clip(text) });
  });

  add("telegram_bot", "Operate a Telegram bot directly with its BotFather token (Bot API). method examples: getMe, sendMessage, sendPhoto, setMyCommands, setMyDescription, getUpdates, deleteWebhook, setWebhook, getChat. Special method 'reply_start' answers every pending /start (and optionally all messages) with reply_text, then marks them read; pair it with create_routine every 5 minutes to keep the bot answering.", { token: str, method: str, params: { type: "object" }, reply_text: str, reply_all: { type: "boolean" } }, ["token", "method"], async (args) => {
    const input = z.object({ token: z.string().regex(/^\d+:[A-Za-z0-9_-]{20,}$/, "Invalid bot token"), method: z.string().regex(/^[A-Za-z_]{2,40}$/), params: z.record(z.unknown()).optional(), reply_text: z.string().max(4000).optional(), reply_all: z.boolean().optional() }).parse(args);
    const call = async (method: string, params: unknown = {}) => {
      const r = await fetch(`https://api.telegram.org/bot${input.token}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(params) });
      const j = (await r.json().catch(() => ({ ok: false, description: `HTTP ${r.status}` }))) as { ok: boolean; result?: any; description?: string };
      if (!j.ok) throw new Error(`Telegram: ${j.description || "request failed"}`);
      return j.result;
    };
    if (input.method === "reply_start") {
      if (!input.reply_text) throw new Error("reply_text required");
      await call("deleteWebhook", { drop_pending_updates: false });
      const updates = (await call("getUpdates", { timeout: 0, limit: 100 })) as any[];
      let replied = 0, last = 0;
      for (const u of updates) {
        last = Math.max(last, u.update_id);
        const m = u.message;
        if (!m?.chat?.id) continue;
        if (input.reply_all || /^\/start\b/.test(m.text || "")) { await call("sendMessage", { chat_id: m.chat.id, text: input.reply_text }); replied++; }
      }
      if (last) await call("getUpdates", { offset: last + 1, limit: 1, timeout: 0 });
      return JSON.stringify({ processed: updates.length, replied });
    }
    return clip(JSON.stringify(await call(input.method, input.params || {})));
  });

  add("weather", "Current weather and 3-day forecast for a city (keyless).", { city: str }, ["city"], async (args) => {
    const { city } = z.object({ city: z.string().min(1).max(100) }).parse(args);
    const geo: any = await getJson(`https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(city)}`);
    const p = geo.results?.[0]; if (!p) throw new Error("City not found");
    const w = await getJson(`https://api.open-meteo.com/v1/forecast?latitude=${p.latitude}&longitude=${p.longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=3&timezone=auto`);
    return JSON.stringify({ place: `${p.name}, ${p.country}`, ...w });
  });
  add("exchange_rate", "Live currency exchange rates (keyless).", { base: str, to: str }, ["base"], async (args) => {
    const { base, to } = z.object({ base: z.string().length(3), to: z.string().optional() }).parse(args);
    const j: any = await getJson(`https://open.er-api.com/v6/latest/${base.toUpperCase()}`);
    return JSON.stringify(to ? { base, to, rate: j.rates?.[to.toUpperCase()], updated: j.time_last_update_utc } : { base, rates: j.rates, updated: j.time_last_update_utc });
  });
  add("crypto_price", "Live crypto prices in USD by CoinGecko ids (comma separated, e.g. bitcoin,ethereum).", { ids: str }, ["ids"], async (args) => {
    const { ids } = z.object({ ids: z.string().regex(/^[a-z0-9,-]{1,300}$/) }).parse(args);
    return JSON.stringify(await getJson(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`));
  });
  add("wikipedia", "Get a Wikipedia summary for a topic in any language (lang like en, ar).", { topic: str, lang: str }, ["topic"], async (args) => {
    const { topic, lang } = z.object({ topic: z.string().min(1).max(200), lang: z.string().regex(/^[a-z]{2,3}$/).default("en") }).parse(args);
    const s: any = await getJson(`https://${lang}.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=1&srsearch=${encodeURIComponent(topic)}`);
    const title = s.query?.search?.[0]?.title; if (!title) throw new Error("No article found");
    const j: any = await getJson(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    return JSON.stringify({ title: j.title, extract: j.extract, url: j.content_urls?.desktop?.page });
  });
  add("news_feed", "Read latest items from any RSS/Atom feed URL, or Google News for a query.", { url: str, query: str }, [], async (args) => {
    const { url, query } = z.object({ url: z.string().url().optional(), query: z.string().max(200).optional() }).parse(args);
    const target = url ? publicBrowserUrl(url) : `https://news.google.com/rss/search?q=${encodeURIComponent(query || "news")}`;
    const xml = await (await fetch(target, { headers: { "User-Agent": "CeyoAgent/1.0" } })).text();
    const items = [...xml.matchAll(/<(item|entry)[\s\S]*?<\/\1>/g)].slice(0, 15).map((m) => {
      const b = m[0]; const g = (t: string) => (new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`).exec(b)?.[1] || "").replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim();
      return { title: g("title"), link: g("link") || /href="([^"]+)"/.exec(b)?.[1], date: g("pubDate") || g("updated") };
    });
    return JSON.stringify(items);
  });
  add("qr_code", "Create a QR code image link for any text or URL.", { text: str }, ["text"], async (args) => {
    const { text } = z.object({ text: z.string().min(1).max(1500) }).parse(args);
    return JSON.stringify({ image_url: `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(text)}`, instruction: "Show it as a markdown image." });
  });
  add("current_time", "Get the exact current date and time in any IANA time zone (e.g. Africa/Cairo).", { timezone: str }, [], async (args) => {
    const { timezone } = z.object({ timezone: z.string().max(60).default("UTC") }).parse(args);
    return JSON.stringify({ timezone, now: new Date().toLocaleString("en-GB", { timeZone: timezone, dateStyle: "full", timeStyle: "long" }), iso_utc: new Date().toISOString() });
  });
  return list;
}
