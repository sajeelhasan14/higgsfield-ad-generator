// The frame around every dashboard page: sidebar, and a top bar that says when the app is in a test mode.
import { Breadcrumb, MobileNav, Sidebar } from '@/components/shell/Navigation';
import { BRAND } from '@/lib/ads/brand';
import { GENERATION_DRY_RUN, PUBLISH_DRY_RUN } from '@/lib/config';

export default function DashboardLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-screen">
      <Sidebar storeName={BRAND.name} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        {/* A soft dot pattern in the top-right corner, fading out. */}
        <div className="pointer-events-none absolute right-0 top-0 h-80 w-[28rem] bg-[radial-gradient(#d6d1c5_1px,transparent_1px)] bg-size-[14px_14px] mask-[radial-gradient(ellipse_at_top_right,black,transparent_70%)]" />
        <div className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-canvas/90 px-6 backdrop-blur lg:px-10">
          <div className="flex items-center gap-3">
            <MobileNav />
            <div className="hidden sm:block">
              <Breadcrumb />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Tells you at a glance whether a click can cost money or post for real. */}
            <ModeBadge on={GENERATION_DRY_RUN} onText="AI: dry run (free)" offText="AI: live (paid)" />
            <ModeBadge on={PUBLISH_DRY_RUN} onText="Posting: dry run" offText="Posting: live" />
          </div>
        </div>
        <main className="relative mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

function ModeBadge({ on, onText, offText }: { on: boolean; onText: string; offText: string }) {
  return (
    <span
      className={`hidden items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium sm:flex ${
        on ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-teal-200 bg-teal-50 text-teal-800'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-amber-500' : 'bg-teal-500'}`} />
      {on ? onText : offText}
    </span>
  );
}
