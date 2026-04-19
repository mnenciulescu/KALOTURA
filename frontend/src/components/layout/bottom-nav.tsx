'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart2, Settings } from 'lucide-react';
import { cn, localToday } from '@/lib/utils';
import { useAppStore } from '@/lib/store';

const navItems = [
  { href: '/', label: 'Today', icon: Home },
  { href: '/stats', label: 'Stats', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);

  return (
    <nav className="safe-bottom fixed bottom-0 left-1/2 z-30 flex w-full max-w-[430px] -translate-x-1/2 items-center justify-around border-t border-[var(--color-border)] bg-white/90 backdrop-blur-md">
      {navItems.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={href === '/' ? () => setSelectedDate(localToday()) : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150',
              active
                ? 'text-[var(--color-primary)]'
                : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]',
            )}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
