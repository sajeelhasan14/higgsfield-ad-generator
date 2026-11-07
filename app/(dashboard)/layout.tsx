// The frame around every dashboard page: sidebar, and a top bar that only speaks up when the app is in a test mode.
import { Breadcrumb, MobileNav, Sidebar } from '@/components/shell/Navigation';
import { BRAND } from '@/lib/ads/brand';
import { GENERATION_DRY_RUN, PUBLISH_DRY_RUN } from '@/lib/config';

/** Live is the normal state, so it says nothing; the details are in Setup on the Autopilot page. */
function testModeNote(): string | null {
  if (GENERATION_DRY_RUN && PUBLISH_DRY_RUN) return 'Test mode: no paid AI images, nothing is posted';
  if (GENERATION_DRY_RUN) return 'Test mode: no paid AI images';
  if (PUBLISH_DRY_RUN) return 'Test mode: nothing is posted';
  return null;
}

export default function DashboardLayout({ children }: LayoutProps<'/'>) {
  const testMode = testModeNote();
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
          {testMode && <p className="hidden text-xs font-medium text-amber-700 sm:block">{testMode}</p>}
        </div>
        <main className="relative mx-auto w-full max-w-7xl flex-1 px-6 py-10 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
