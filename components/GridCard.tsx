import Link from "next/link";

export function GridCard({ href, title, actionLabel = "Open" }: { href: string; title: string; actionLabel?: string }) {
  return (
    <Link
      href={href}
      prefetch={true}
      className="group flex h-full w-full aspect-square flex-col justify-between rounded-2xl border bg-card p-4 sm:p-5 shadow-sm transition-all hover:bg-accent/60 hover:border-border/80 hover:shadow-md active:scale-[0.98] select-none"
    >
      <span className="text-sm sm:text-[15px] font-semibold leading-snug line-clamp-3 break-words text-foreground">{title}</span>
      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors pt-2">
        {actionLabel} <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </Link>
  );
}

export function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 auto-rows-fr">{children}</div>;
}

