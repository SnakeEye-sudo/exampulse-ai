'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from './AppProvider';
import { daysToExam } from '@/lib/store';

const NAV = [
  { href: '/', key: 'dashboard', icon: 'M3 10.5L10 4l7 6.5V17a1 1 0 01-1 1h-3.5v-4.5h-5V18H4a1 1 0 01-1-1z' },
  { href: '/news', key: 'news', icon: 'M4 4h9v12H4zM13 8h3v7a1.5 1.5 0 01-3 0z' },
  { href: '/quiz', key: 'quiz', icon: 'M7 7a3 3 0 115 2.2c-.8.7-1 1.1-1 2.3M10 15.5h.01' },
  { href: '/revision', key: 'revision', icon: 'M4 10a6 6 0 1 1 1.8 4.3M4 10V6m0 4h4' },
  { href: '/search', key: 'search', icon: 'M9 15a6 6 0 106-6 6 6 0 00-6 6zm4.5 4.5L17 17' },
] as const;

const MORE = [
  { href: '/mistakes', key: 'mistakes' },
  { href: '/state', key: 'stateAffairs' },
  { href: '/magazine', key: 'magazine' },
  { href: '/ask', key: 'ask' },
  { href: '/progress', key: 'progress' },
  { href: '/settings', key: 'settings' },
] as const;

export function Shell({ children }: { children: React.ReactNode }) {
  const { T, state, hydrated, lang, setLang } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  // A student who has not chosen an exam gets a feed ranked for nobody.
  useEffect(() => {
    if (!hydrated) return;
    if (!state.profile.onboarded && pathname !== '/onboarding') router.replace('/onboarding');
  }, [hydrated, state.profile.onboarded, pathname, router]);

  useEffect(() => { setMoreOpen(false); }, [pathname]);

  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  if (pathname === '/onboarding') return <>{children}</>;

  const dte = daysToExam(state.profile);
  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur-md no-print">
        <div className="mx-auto max-w-content px-4 h-14 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight shrink-0">
            <span className="grid place-items-center w-7 h-7 rounded-md bg-brand text-white text-[11px] font-bold">EP</span>
            <span className="hidden sm:inline text-[15px]">ExamPulse<span className="text-brand"> AI</span></span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5 ml-3">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  isActive(n.href) ? 'bg-brandsoft text-brand font-medium' : 'text-muted hover:text-ink'}`}>
                {T(n.key)}
              </Link>
            ))}
            <div className="relative">
              <button onClick={() => setMoreOpen((v) => !v)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${moreOpen ? 'bg-brandsoft text-brand' : 'text-muted hover:text-ink'}`}
                aria-expanded={moreOpen} aria-haspopup="menu">
                More ▾
              </button>
              {moreOpen && (
                <div role="menu" className="absolute right-0 mt-1 w-52 card p-1 shadow-lg rise">
                  {MORE.map((m) => (
                    <Link key={m.href} href={m.href} role="menuitem"
                      className={`block px-3 py-2 rounded text-sm ${isActive(m.href) ? 'bg-brandsoft text-brand' : 'hover:bg-brandsoft/60'}`}>
                      {T(m.key)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            {dte !== null && dte >= 0 && (
              <Link href="/settings" className="hidden sm:flex chip border-hot/40 text-hot bg-hot/[0.06]">
                D−{dte}
              </Link>
            )}
            {state.streak.current > 0 && (
              <span className="chip border-warm/40 text-warm bg-warm/[0.06]" title="Study streak">
                🔥 {state.streak.current}
              </span>
            )}
            <button
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="btn !px-2.5 !py-1.5 text-xs font-semibold"
              aria-label="Toggle language">
              {lang === 'en' ? 'हिं' : 'EN'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-content w-full px-4 py-5 pb-24 md:pb-10">{children}</main>

      {/* Mobile tab bar — thumb-reachable, five destinations, no hamburger. */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 border-t border-line bg-paper/95 backdrop-blur-md no-print"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="grid grid-cols-6">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] ${isActive(n.href) ? 'text-brand' : 'text-faint'}`}>
              <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d={n.icon} />
              </svg>
              <span className="truncate max-w-full px-0.5">{T(n.key)}</span>
            </Link>
          ))}
          <button onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] ${moreOpen ? 'text-brand' : 'text-faint'}`}>
            <svg width="19" height="19" viewBox="0 0 20 20" fill="currentColor"><circle cx="4" cy="10" r="1.6" /><circle cx="10" cy="10" r="1.6" /><circle cx="16" cy="10" r="1.6" /></svg>
            More
          </button>
        </div>
        {moreOpen && (
          <div className="absolute bottom-full inset-x-0 border-t border-line bg-paper p-2 grid grid-cols-3 gap-1.5 rise">
            {MORE.map((m) => (
              <Link key={m.href} href={m.href}
                className={`text-center text-xs py-2.5 rounded-md border border-line ${isActive(m.href) ? 'bg-brandsoft text-brand' : ''}`}>
                {T(m.key)}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}
