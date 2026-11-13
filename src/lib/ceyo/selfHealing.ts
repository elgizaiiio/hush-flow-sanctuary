/** @doc Long-task support for the agent loop: tool-failure reflection and context compaction. */
type Msg = { role: string; content?: string | null; tool_calls?: any[]; tool_call_id?: string; name?: string };

export const MAX_SAME_FAILURES = 3;

/** Tracks repeated failures of the same tool+input so the agent changes approach instead of looping. */
export function createFailureTracker() {
  const counts = new Map<string, number>();
  return {
    record(name: string, args: unknown, ok: boolean): { attempt: number; note: string | null; giveUp: boolean } {
      const key = `${name}:${JSON.stringify(args ?? {}).slice(0, 500)}`;
      if (ok) { counts.delete(key); return { attempt: 0, note: null, giveUp: false }; }
      const attempt = (counts.get(key) ?? 0) + 1;
      counts.set(key, attempt);
      if (attempt >= MAX_SAME_FAILURES) return { attempt, giveUp: true, note: `This exact action failed ${attempt} times. Do not repeat it. Use a different method, or tell the user honestly what blocked you.` };
      return { attempt, giveUp: false, note: `Self-check (attempt ${attempt}/${MAX_SAME_FAILURES}): read the error, find the cause, then change the code, selector or approach before retrying. If on a website, use look to see the page first.` };
    },
  };
}

/** Shrinks old tool outputs when the transcript grows, keeping the latest ones intact. */
export function compactMessages(messages: Msg[], budget = 60_000, keepRecent = 6): Msg[] {
  const size = () => messages.reduce((n, m) => n + (m.content?.length ?? 0), 0);
  if (size() <= budget) return messages;
  const toolIdx = messages.map((m, i) => (m.role === "tool" ? i : -1)).filter((i) => i >= 0);
  for (const i of toolIdx.slice(0, Math.max(0, toolIdx.length - keepRecent))) {
    const c = messages[i].content ?? "";
    if (c.length > 600) messages[i] = { ...messages[i], content: `${c.slice(0, 400)}\n…[older output shortened; rerun if needed]…\n${c.slice(-150)}` };
    if (size() <= budget) break;
  }
  return messages;
}

export const PLANNING_RULES = `Operating loop (OpenManus/Grok style): THINK which tool moves the task forward, ACT by calling it, OBSERVE the result, then decide the next step; repeat until the goal is done, then give the final answer. For goals needing several steps, first call update_plan with short numbered steps and mark them [x] as you finish. Tool choice: facts/news → web_search then read_url; any public API → http_request; computing, data, scraping, files, scripts → run_code (pip/npm install inside it); writing or fixing files on the computer → file_editor; websites that need clicking or a signed-in account → browser (look before click_at); Telegram bots → host_telegram_bot. When a tool fails, read the error, fix the cause and retry differently (other code, selector, source or tool); try at least two alternatives before reporting a blocker. Verify the outcome with a tool (re-read, re-run, getMe, look) before saying it is done. Never claim a step done without tool evidence. Final answer: the result itself, short, with links/files, and any part still unfinished.`;

/** The model printed a tool call as text (JSON, XML or harmony syntax) instead of calling it. */
export function looksLikeFakeToolCall(text: string, toolNames: readonly string[] = []): boolean {
  if (/```(json)?\s*\{[\s\S]*"(action|tool|tool_name|function|name)"\s*:/.test(text)) return true;
  if (/<\/?(tool_call|function_call|invoke)\b/i.test(text) || /\bto=functions\.\w+/.test(text)) return true;
  return toolNames.some((n) => n.length > 3 && new RegExp(`\\{\\s*"(name|tool)"\\s*:\\s*"${n}"`).test(text));
}

/** First-answer refusal or "do it yourself" instructions where tools could act instead. */
export function looksLikeRefusal(text: string): boolean {
  const t = text.toLowerCase();
  return /\b(i can(?:'|no)t|i(?:'m| am) (?:unable|not able)|i don'?t have (?:access|the ability)|as an ai|you (?:can|will need to|need to|should) (?:run|install|deploy|open|go to))\b/.test(t)
    || /(لا أستطيع|لا استطيع|لا يمكنني|ما اقدرش|مقدرش|مش هقدر|معنديش صلاحية|ليس لدي (?:القدرة|صلاحية)|لا أملك (?:القدرة|صلاحية)|يمكنك (?:تشغيل|تثبيت|رفع)|عليك (?:تشغيل|تثبيت|رفع))/.test(text);
}
