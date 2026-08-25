import Link from "next/link";

export type Crumb = { label: string; href?: string };

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="-ml-1.5 flex min-h-[28px] items-center gap-1 overflow-x-auto text-sm text-muted-foreground">
      {items.map((c, i) => (
        <span key={i} className="flex items-center gap-1 shrink-0">
          {i > 0 && <span aria-hidden className="text-muted-foreground/60 select-none">/</span>}
          {c.href ? (
            <Link href={c.href} className="rounded-md px-1.5 py-1 transition-colors hover:bg-accent hover:text-foreground">
              {c.label}
            </Link>
          ) : (
            <span className="rounded-md px-1.5 py-1 font-medium text-foreground">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

