import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IntegrationLogo } from "@/components/chat/integrations/IntegrationRow";
import { integrations, type Integration } from "@/lib/integrationsData";
import { integrationApproval, integrationApprovalStatus } from "@/lib/ceyo/integrations.functions";

const human = (slug: string, app: string) => slug.replace(new RegExp(`^${app}_`, "i"), "").replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
const findApp = (app: string): Integration => {
  const key = app.toLowerCase().replace(/[\s_-]+/g, "");
  return integrations.find((i) => [i.id, i.app, i.name].some((v) => (v || "").toLowerCase().replace(/[\s_-]+/g, "") === key)) || ({ id: key, app: key, name: app, domain: `${key}.com`, description: "" } as unknown as Integration);
};

/** Clean approval for a connected-app action: app icon, plain description, Allow / Always allow / Decline. */
export function IntegrationApprovalCard({ data, onDone, onApproved, ar = false }: { data: Record<string, any>; onDone: () => void; onApproved?: (summary: string) => void; ar?: boolean }) {
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState("");
  const approve = useServerFn(integrationApproval);
  const read = useServerFn(integrationApprovalStatus);
  useEffect(() => { void read({ data: { id: String(data.id) } }).then((r) => setStatus(r.status)).catch(() => {}); }, [data.id, read]);
  const item = findApp(String(data.app || "app"));
  const action = human(String(data.action || ""), item.app);
  const args = Object.entries((data.arguments || {}) as Record<string, unknown>).filter(([, v]) => v !== null && v !== "" && typeof v !== "object").slice(0, 4);
  const decide = async (approved: boolean, always = false) => {
    setStatus("running"); setError("");
    try {
      const result = await approve({ data: { id: String(data.id), approved, always } });
      setStatus(result.status); onDone();
      if (approved && result.status === "completed") onApproved?.(ar ? `وافقت على "${action}" في ${item.name} واتنفذت. كمّل الشغل من الخطوة اللي وقفت عندها بالظبط، من غير ما تعيد اللي خلص.` : `I approved "${action}" on ${item.name} and it ran. Continue from the exact step you stopped at without redoing finished steps.`);
    } catch (e) { setStatus("failed"); setError(e instanceof Error ? e.message : "Action failed"); }
  };
  return (
    <div className="apcard" dir="auto">
      <div className="apcard-head">
        <span className="apcard-logo"><IntegrationLogo item={item} size={32} /></span>
        <span className="apcard-title"><strong>{ar ? `${item.name} محتاج موافقتك` : `${item.name} needs your OK`}</strong><small>{String(data.account || "")}</small></span>
      </div>
      <p className="apcard-action">{action}</p>
      {args.length > 0 && <dl className="apcard-args">{args.map(([k, v]) => <div key={k}><dt>{k.replace(/_/g, " ")}</dt><dd>{String(v).slice(0, 120)}</dd></div>)}</dl>}
      {status === "pending" ? (
        <div className="apcard-actions">
          <Button size="sm" onClick={() => void decide(true)}><Check />{ar ? "موافق" : "Allow"}</Button>
          <Button size="sm" variant="secondary" onClick={() => void decide(true, true)}>{ar ? `موافق دايماً لـ ${item.name}` : `Always allow ${item.name}`}</Button>
          <Button size="sm" variant="ghost" onClick={() => void decide(false)}><X />{ar ? "لأ" : "Decline"}</Button>
        </div>
      ) : (
        <p className="apcard-status" role="status" data-status={status}>
          {status === "running" ? <><Loader2 size={14} className="animate-spin" />{ar ? "بينفّذ…" : "Working…"}</> : status === "completed" ? <><Check size={14} />{ar ? "اتنفذت" : "Done"}</> : status === "rejected" ? (ar ? "اترفضت" : "Declined") : (ar ? "ما نجحتش" : "Failed")}
        </p>
      )}
      {error && <p className="text-destructive text-sm mt-2">{error}</p>}
    </div>
  );
}
