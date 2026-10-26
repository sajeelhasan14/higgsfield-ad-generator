import type { Metadata } from 'next';
import { LoginForm } from '@/components/LoginForm';
import { Icon } from '@/components/shell/Icon';

export const metadata: Metadata = { title: 'Log in · Ad Studio' };

export default function LoginPage() {
  return (
    <main className="relative grid min-h-screen place-items-center px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#d6d1c5_1px,transparent_1px)] bg-size-[14px_14px] mask-[radial-gradient(ellipse_at_center,black,transparent_65%)]" />
      <div className="relative w-full max-w-sm rounded-3xl border border-line bg-surface p-8 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)]">
        <div className="mb-6 grid h-11 w-11 place-items-center rounded-xl bg-brand text-white">
          <Icon name="sparkle" />
        </div>
        <p className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-muted">
          <span className="h-px w-5 bg-brand" /> AD STUDIO
        </p>
        <h1 className="mt-1 font-display text-4xl font-extrabold tracking-tight">
          Welcome back<span className="text-brand">.</span>
        </h1>
        <p className="mb-6 mt-2 text-sm italic text-muted">sync · generate · schedule</p>
        <LoginForm />
      </div>
    </main>
  );
}
