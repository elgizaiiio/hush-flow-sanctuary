import { useEffect, useState, type ReactNode } from "react";
import { Globe, ArrowUpRight } from "lucide-react";

export function ChatLink({ href, children }: { href?: string; children?: ReactNode }) {
  let url: URL;
  try { url = new URL(href || ""); } catch { return <>{children}</>; }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) return <>{children}</>;
  return <NamedLink url={url} label={children} />;
}

function NamedLink({ url, label }: { url: URL; label?: ReactNode }) {
  const plain = typeof label === "string" ? label : "";
  const named = plain && !/^https?:\/\//i.test(plain);
  const host = url.hostname.replace(/^www\./, "");
  let path = "";
  try { path = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "").replace(/[-_]/g, " ").replace(/\.[a-z]{2,5}$/i, ""); } catch { /* use site name */ }
  const [title, setTitle] = useState(named ? plain : path ? `${path} · ${host}` : host);
  const [iconFailed, setIconFailed] = useState(false);
  useEffect(() => {
    setIconFailed(false);
    setTitle(named ? plain : path ? `${path} · ${host}` : host);
    // Never send private query strings, login URLs or credentials to a metadata service.
    if (named || url.search || url.hash || /login|auth|sign|token|private|account/i.test(url.pathname)) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    void fetch(url.href, { credentials: "omit", mode: "cors", referrerPolicy: "no-referrer", signal: controller.signal }).then(async (response) => {
      if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) return;
      const html = (await response.text()).slice(0, 100000);
      const actual = new DOMParser().parseFromString(html, "text/html").querySelector("title")?.textContent?.trim();
      if (actual && !controller.signal.aborted) setTitle(actual.slice(0, 180));
    }).catch(() => {}).finally(() => clearTimeout(timer));
    return () => { controller.abort(); clearTimeout(timer); };
  }, [url.href, named, plain, path, host]);
  return <a href={url.href} target="_blank" rel="noopener noreferrer" title={title} className="cx-named-link">
    {iconFailed ? <Globe size={14} aria-hidden /> : <img src={siteIcon(url.hostname)} alt="" width={16} height={16} referrerPolicy="no-referrer" onError={() => setIconFailed(true)} />}
    <span dir="auto">{title}</span><ArrowUpRight size={12} aria-hidden />
  </a>;
}
/** Simple, reliable favicon source for any site (Google's public favicon service, host only — no path or query). */
export function siteIcon(host: string, size = 64) {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
}
