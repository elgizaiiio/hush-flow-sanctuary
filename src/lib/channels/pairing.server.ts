import type { SupabaseClient } from "@supabase/supabase-js";
import { pairingHash } from "./security";
import { channelCredential } from "./credentials.server";
import { telegramRequest } from "@/lib/keys/telegram.server";

export async function createTelegramPairing(db: SupabaseClient, userId: string, botId: string) {
  // Ownership must be checked with the caller's RLS client before privileged writes.
  const { data: bot, error } = await db.from("bots").select("id,name").eq("id", botId).eq("owner_id", userId).maybeSingle();
  if (error || !bot) throw new Error("Bot unavailable");
  const token = await channelCredential("CEYO_TELEGRAM_CHANNEL_TOKEN");
  if (!token) throw new Error("Telegram channel is not configured");
  const me = await telegramRequest(token, "getMe", {});
  const username = me.result?.username;
  if (typeof username !== "string" || !/^\w+$/.test(username)) throw new Error("Telegram bot unavailable");
  const code = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const stored = await supabaseAdmin.from("channel_pairings").insert({ platform: "telegram", user_id: userId, bot_id: botId, token_hash: await pairingHash(code), expires_at: expiresAt });
  if (stored.error) throw new Error("Could not create connection link");
  return { url: `https://t.me/${username}?start=${code}`, name: bot.name, expiresAt };
}