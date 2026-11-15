import { useState } from "react";
import { z } from "zod";
import { BadgeCheck, Bookmark, Eye, Heart, MessageCircle, MoreHorizontal, Play, Repeat2, Send, Share2, ThumbsUp, BarChart3 } from "lucide-react";
import { socialItemSchema, type SocialItem } from "@/lib/ceyo/socialResults";
import { siteIcon } from "@/components/chat/ChatLink";

const dataSchema = z.object({ items: z.array(socialItemSchema).max(20) });
const hosts: Record<SocialItem["platform"], string> = { instagram: "instagram.com", youtube: "youtube.com", tiktok: "tiktok.com", x: "x.com", facebook: "facebook.com", linkedin: "linkedin.com", reddit: "reddit.com", social: "" };

function Img({ src, className, alt = "" }: { src?: string; className: string; alt?: string }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return <div className={`${className} bg-muted`} />;
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setBad(true)} className={`${className} object-cover`} />;
}
function Avatar({ item, size = "size-9" }: { item: SocialItem; size?: string }) {
  return <Img src={item.avatar || (item.kind === "account" ? item.image : undefined)} className={`${size} shrink-0 rounded-full`} />;
}
function Name({ item }: { item: SocialItem }) {
  return <span className="flex min-w-0 items-center gap-1 font-semibold"><span className="truncate" dir="auto">{item.author || item.handle || item.title}</span>{item.verified && <BadgeCheck size={15} className="shrink-0 text-primary" />}</span>;
}
const Logo = ({ p }: { p: SocialItem["platform"] }) => hosts[p] ? <img src={siteIcon(hosts[p])} alt="" className="size-4 rounded-sm" /> : null;

export function SocialResultsCard({ data, ar }: { data: unknown; ar: boolean }) {
  const result = dataSchema.safeParse(data);
  if (!result.success || !result.data.items.length) return null;
  const n = new Intl.NumberFormat(ar ? "ar" : "en", { notation: "compact", maximumFractionDigits: 1 });
  const f = (v?: number) => v === undefined ? "" : n.format(v);
  const when = (d?: string) => { const t = Date.parse(d || ""); return Number.isFinite(t) ? new Intl.DateTimeFormat(ar ? "ar" : "en", { month: "short", day: "numeric", year: "numeric" }).format(t) : ""; };
  const dur = (s?: number) => s === undefined ? "" : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const card = (item: SocialItem) => {
    if (item.kind === "account") return <div className="p-4">
      <div className="flex items-center gap-4"><Avatar item={item} size="size-20" />
        <div className="grid flex-1 grid-cols-3 text-center text-sm">
          {[[item.posts, ar ? "منشور" : "posts"], [item.followers, ar ? "متابِع" : "followers"], [item.following, ar ? "يتابع" : "following"]].map(([v, l]) => <div key={l as string}><div className="font-semibold">{f(v as number) || "—"}</div><div className="text-xs text-muted-foreground">{l}</div></div>)}
        </div></div>
      <div className="mt-3 text-sm"><Name item={item} />{item.handle && <div className="text-muted-foreground" dir="ltr">@{item.handle}</div>}
        {item.text && <p className="mt-1 line-clamp-4 whitespace-pre-wrap" dir="auto">{item.text}</p>}</div>
      <div className="mt-3 rounded-lg bg-primary py-1.5 text-center text-sm font-semibold text-primary-foreground">{ar ? "متابعة" : "Follow"}</div>
    </div>;
    switch (item.platform) {
      case "x": return <div className="flex gap-3 p-4"><Avatar item={item} size="size-10" />
        <div className="min-w-0 flex-1 text-sm">
          <div className="flex items-center gap-1"><Name item={item} />{item.handle && <span className="truncate text-muted-foreground" dir="ltr">@{item.handle}</span>}{when(item.date) && <span className="text-muted-foreground">· {when(item.date)}</span>}</div>
          {item.text && <p className="mt-1 whitespace-pre-wrap break-words" dir="auto">{item.text}</p>}
          {item.image && <Img src={item.image} className="mt-3 aspect-video w-full rounded-2xl border border-border" />}
          <div className="mt-3 flex justify-between text-muted-foreground">
            {[[MessageCircle, item.comments], [Repeat2, item.shares], [Heart, item.likes], [BarChart3, item.views]].map(([I, v], i) => { const Icon = I as typeof Heart; return <span key={i} className="flex items-center gap-1 text-xs"><Icon size={16} />{f(v as number)}</span>; })}
          </div></div></div>;
      case "youtube": return <div>
        <div className="relative"><Img src={item.image} className="aspect-video w-full" />{dur(item.duration) && <span className="absolute bottom-2 end-2 rounded bg-foreground/80 px-1.5 text-xs font-medium text-background">{dur(item.duration)}</span>}</div>
        <div className="flex gap-3 p-3"><Avatar item={item} />
          <div className="min-w-0 text-sm"><h3 className="line-clamp-2 font-semibold" dir="auto">{item.title}</h3>
            <p className="text-xs text-muted-foreground" dir="auto">{[item.author, item.views !== undefined && `${f(item.views)} ${ar ? "مشاهدة" : "views"}`, when(item.date)].filter(Boolean).join(" • ")}</p>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">{item.likes !== undefined && <span className="flex items-center gap-1"><ThumbsUp size={14} />{f(item.likes)}</span>}{item.comments !== undefined && <span className="flex items-center gap-1"><MessageCircle size={14} />{f(item.comments)}</span>}</div>
          </div></div></div>;
      case "tiktok": return <div className="relative mx-auto aspect-[9/16] max-h-[520px] w-full overflow-hidden bg-muted">
        <Img src={item.image} className="absolute inset-0 size-full" />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-transparent to-transparent" />
        <Play className="absolute start-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-background/90" size={48} fill="currentColor" />
        <div className="absolute end-2 bottom-24 flex flex-col items-center gap-4 text-xs font-semibold text-background">
          {[[Heart, item.likes], [MessageCircle, item.comments], [Bookmark, undefined], [Share2, item.shares]].map(([I, v], i) => { const Icon = I as typeof Heart; return <span key={i} className="flex flex-col items-center gap-1"><Icon size={26} fill="currentColor" />{f(v as number)}</span>; })}
        </div>
        <div className="absolute bottom-3 start-3 end-14 text-sm text-background"><div className="font-semibold" dir="ltr">@{item.handle || item.author}</div>{item.text && <p className="line-clamp-2" dir="auto">{item.text}</p>}{item.views !== undefined && <span className="mt-1 flex items-center gap-1 text-xs"><Eye size={13} />{f(item.views)}</span>}</div>
      </div>;
      default: return <div>
        <div className="flex items-center gap-3 px-3 py-2.5 text-sm"><Avatar item={item} size="size-8" /><div className="min-w-0 flex-1"><Name item={item} />{when(item.date) && <div className="text-xs text-muted-foreground">{when(item.date)}</div>}</div><MoreHorizontal size={18} /></div>
        {item.platform === "facebook" && item.text && <p className="px-3 pb-2 text-sm whitespace-pre-wrap" dir="auto">{item.text}</p>}
        <div className="relative"><Img src={item.image} className={item.kind === "reel" ? "aspect-[4/5] w-full" : "aspect-square w-full"} />{item.kind !== "post" && <Play className="absolute end-3 top-3 text-background" size={22} fill="currentColor" />}</div>
        <div className="flex items-center gap-4 px-3 pt-3"><Heart size={24} /><MessageCircle size={24} /><Send size={22} /><Bookmark size={22} className="ms-auto" /></div>
        <div className="space-y-1 px-3 pt-2 pb-3 text-sm">
          {item.likes !== undefined && <div className="font-semibold">{f(item.likes)} {ar ? "إعجاب" : "likes"}</div>}
          {item.views !== undefined && <div className="text-muted-foreground">{f(item.views)} {ar ? "مشاهدة" : "views"}</div>}
          {item.platform !== "facebook" && item.text && <p className="line-clamp-3 whitespace-pre-wrap" dir="auto"><span className="font-semibold">{item.handle || item.author} </span>{item.text}</p>}
          {item.comments !== undefined && <div className="text-muted-foreground">{ar ? `عرض كل التعليقات (${f(item.comments)})` : `View all ${f(item.comments)} comments`}</div>}
        </div></div>;
    }
  };

  return <div className="grid w-full max-w-md gap-3" dir={ar ? "rtl" : "ltr"}>
    {result.data.items.map((item, i) => <a key={`${item.url}-${i}`} href={item.url} target="_blank" rel="noopener noreferrer" className="relative block overflow-hidden rounded-2xl border border-border bg-card text-card-foreground no-underline transition hover:border-foreground/30">
      {card(item)}
      <span className="absolute top-2 start-2 rounded-full bg-background/80 p-1 backdrop-blur"><Logo p={item.platform} /></span>
    </a>)}
  </div>;
}
