import { supabaseAdmin as db } from "@/integrations/supabase/client.server";
import { runAgentLoop } from "@/lib/ceyo/agentLoop.server";
import { workspaceTools } from "@/lib/ceyo/workspaceTools.server";
import { agentPrompt } from "@/lib/ceyo/prompt";
const userId = "458e1c96-872b-4abf-b821-46a4aec69118";
const { data: prof } = await db.from("profiles").select("primary_bot_id").eq("id", userId).single();
const { data: conv } = await db.from("conversations").select("id,bot_id").eq("user_id", userId).eq("bot_id", prof!.primary_bot_id!).order("updated_at", { ascending: false }).limit(1).single();
const { data: bot } = await db.from("bots").select("name,instructions").eq("id", conv!.bot_id!).single();
const which = process.argv[2];
const token = process.env.TELEGRAM_BOT_TOKEN!;
const cases: Record<string, { role: string; content: string }[]> = {
  a: [{ role: "user", content: `ده توكن البوت بتاعي ${token}` }, { role: "assistant", content: "تمام، استلمت التوكن." }, { role: "user", content: "بص هربط البوت ده ك مدير لحساب تليجرام بتاعي وعايزك تقرا رسايل حسابي" }],
  b: [{ role: "user", content: "اعملي مقارنة لأسعار آيفون 16 برو في مصر والسعودية والإمارات محولة كلها للجنيه المصري النهارده، وطلعهالي في ملف إكسل" }],
  c: [{ role: "user", content: "انا عايز اعمل متجر صغير ابيع فيه تيشيرتات، ابدألي" }],
};
const used: string[] = [];
const emit = (e: any) => { if (e.type === "agent.tool_use") { used.push(e.part?.tool_name || e.part?.name); console.log("USE", e.part?.tool_name, JSON.stringify(e.part?.input ?? e.part?.arguments ?? "").slice(0, 160)); } if (e.type === "agent.tool_result") console.log("  RES", e.part?.status, String(typeof e.part?.result === "string" ? e.part.result : JSON.stringify(e.part?.result)).slice(0, 200).replace(/\n/g, " ")); };
const system = agentPrompt(bot!.name, bot!.instructions || "", true);
const tools = workspaceTools({ db, userId, botId: conv!.bot_id, conversationId: conv!.id, primary: true, emit, signal: new AbortController().signal, poll: async () => [], origin: "https://id-preview--31d71057-3c67-417c-ae8b-2c7341705a52.lovable.app" });
const t0 = Date.now();
const out = await runAgentLoop(system, cases[which], emit, AbortSignal.timeout(560_000), async () => [], { usageOwner: userId, botId: conv!.bot_id, chatModel: true, extras: tools, maxSteps: 20 });
console.log("TOOLS:", used.join(", "), "| secs", Math.round((Date.now() - t0) / 1000));
console.log("REPLY:\n" + out.replaceAll(token, "<token>"));
