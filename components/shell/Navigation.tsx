'use client';

// The section sidebar, the small-screen menu and the breadcrumb. A client component because the active
// page is read from the address bar (usePathname).
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/app/login/actions';
import { Icon, type IconName } from './Icon';

const PAGES: { href: string; label: string; icon: IconName }[] = [
  { href: '/products', label: 'Products', icon: 'products' },
  { href: '/review', label: 'Review', icon: 'review' },
  { href: '/schedule', label: 'Schedule', icon: 'schedule' },
];

function useCurrentPage() {
  const pathname = usePathname();
  return PAGES.find((p) => pathname.startsWith(p.href));
}

/** On small screens the sidebar is hidden, so the pages and log out sit in the top bar instead. */
export function MobileNav() {
  const current = useCurrentPage();
  return (
    <nav className="flex items-center gap-1 lg:hidden">
      {PAGES.map((p) => (
        <Link
          key={p.href}
          href={p.href}
          title={p.label}
          className={`grid h-9 w-9 place-items-center rounded-lg ${current?.href === p.href ? 'bg-brand-soft text-brand' : 'text-muted hover:text-ink'}`}
        >
          <Icon name={p.icon} className="h-[18px] w-[18px]" />
        </Link>
      ))}
      <form action={logoutAction}>
        <button type="submit" title="Log out" className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:text-ink">
          <Icon name="logout" className="h-[18px] w-[18px]" />
        </button>
      </form>
    </nav>
  );
}

export function Sidebar({ storeName }: { storeName: string }) {
  const current = useCurrentPage();
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
      <Link href="/products" className="flex items-center gap-3 px-2">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">
          <Icon name="sparkle" className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-display text-lg font-bold leading-tight">Ad Studio</span>
          <span className="block text-xs italic text-muted">sync · generate · schedule</span>
        </span>
      </Link>

      <nav className="mt-8 flex flex-col gap-1">
        {PAGES.map((p) => {
          const active = current?.href === p.href;
          return (
            <Link
              key={p.href}
              href={p.href}
              className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? 'bg-brand-soft text-brand' : 'text-ink/75 hover:bg-black/[0.04] hover:text-ink'
              }`}
            >
              {active && <span className="absolute -left-4 h-6 w-1 rounded-r bg-brand" />}
              <Icon name={p.icon} className="h-[18px] w-[18px]" />
              {p.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-3 rounded-2xl border border-line bg-white/60 p-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-rail font-display text-sm font-bold text-white">PH</div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{storeName}</p>
          <p className="text-xs text-muted">Admin</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" title="Log out" className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-black/5 hover:text-ink">
            <Icon name="logout" className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}

export function Breadcrumb() {
  const current = useCurrentPage();
  return (
    <nav className="flex items-center gap-2 text-sm text-muted">
      <Link href="/products" className="hover:text-ink" aria-label="Home">
        <Icon name="home" className="h-4 w-4" />
      </Link>
      <Icon name="chevron" className="h-3.5 w-3.5" />
      <span>Studio</span>
      {current && (
        <>
          <Icon name="chevron" className="h-3.5 w-3.5" />
          <span className="font-medium text-ink">{current.label}</span>
        </>
      )}
    </nav>
  );
}
