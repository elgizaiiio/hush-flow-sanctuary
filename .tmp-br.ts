import { supabaseAdmin as db } from "@/integrations/supabase/client.server";
import { createComputer } from "@/lib/computer/e2b.server";
import { createBotBrowser } from "@/lib/computer/browser.server";
const userId = "458e1c96-872b-4abf-b821-46a4aec69118";
const { data: prof } = await db.from("profiles").select("primary_bot_id").eq("id", userId).single();
const c = createComputer();
const b = createBotBrowser(userId, prof!.primary_bot_id!, c);
try { console.log((await b.run({ action: "navigate", url: "https://www.noon.com/saudi-ar/apple-iphone-16-pro/" })).slice(0, 600)); } catch (e) { console.log("ERR", (e as Error).message); }
await (c as any).close?.(); await (b as any).close?.();
process.exit(0);
