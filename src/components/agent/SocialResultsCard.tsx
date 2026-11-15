import { ExternalLink, Eye, Heart, Users, Play, Image, UserRound, Instagram, Youtube, Music2, Globe, Linkedin, Facebook } from "lucide-react";
import { z } from "zod";
import { socialItemSchema } from "@/lib/ceyo/socialResults";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const dataSchema = z.object({ items: z.array(socialItemSchema).max(20) });
const brands = { instagram: { name: "Instagram", icon: Instagram }, youtube: { name: "YouTube", icon: Youtube }, tiktok: { name: "TikTok", icon: Music2 }, x: { name: "X", icon: Globe }, facebook: { name: "Facebook", icon: Facebook }, linkedin: { name: "LinkedIn", icon: Linkedin }, reddit: { name: "Reddit", icon: Globe }, social: { name: "Social", icon: Globe } };

function ResultImage({ src, alt, profile }: { src?: string; alt: string; profile: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return <img src={src} alt={alt} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={profile ? "size-16 shrink-0 rounded-full object-cover" : "aspect-video w-full object-cover"} />;
}

export function SocialResultsCard({ data, ar }: { data: unknown; ar: boolean }) {
  const result = dataSchema.safeParse(data);
  if (!result.success || !result.data.items.length) return null;
  const kinds = ar ? { account: "حساب", post: "منشور", reel: "ريل", video: "فيديو" } : { account: "Account", post: "Post", reel: "Reel", video: "Video" };
  const number = new Intl.NumberFormat(ar ? "ar" : "en", { notation: "compact", maximumFractionDigits: 1 });
  return <div className="grid w-full max-w-xl gap-3" dir={ar ? "rtl" : "ltr"}>
    {result.data.items.map((item, index) => {
      const brand = brands[item.platform];
      const BrandIcon = brand.icon;
      const KindIcon = item.kind === "account" ? UserRound : item.kind === "post" ? Image : Play;
      return <article key={`${item.url}-${index}`} className="overflow-hidden rounded-lg border border-border bg-card text-card-foreground">
        <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-semibold"><BrandIcon size={17} />{brand.name}</span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><KindIcon size={13} />{kinds[item.kind]}</span>
        </header>
        {item.kind !== "account" && <ResultImage src={item.image} alt={item.title} profile={false} />}
        <div className="flex items-start gap-3 p-4">
          {item.kind === "account" && <ResultImage src={item.image} alt={item.title} profile />}
          <div className="min-w-0 flex-1 space-y-1">
            <h3 className="break-words text-sm font-semibold" dir="auto">{item.title}</h3>
            {item.author && item.author !== item.title && <p className="break-words text-xs text-muted-foreground" dir="auto">{item.author}</p>}
            {item.text && <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm leading-relaxed" dir="auto">{item.text}</p>}
          </div>
        </div>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2">
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {([{ value: item.followers, icon: Users, label: ar ? "متابعين" : "Followers" }, { value: item.likes, icon: Heart, label: ar ? "إعجابات" : "Likes" }, { value: item.views, icon: Eye, label: ar ? "مشاهدات" : "Views" }]).map((metric) => metric.value === undefined ? null : <span key={metric.label} className="flex items-center gap-1" title={metric.label}><metric.icon size={13} /><span>{number.format(metric.value)}</span></span>)}
          </div>
          <Button asChild variant="ghost" size="sm"><a href={item.url} target="_blank" rel="noopener noreferrer">{ar ? "فتح" : "Open"}<ExternalLink size={14} /></a></Button>
        </footer>
      </article>;
    })}
  </div>;
}