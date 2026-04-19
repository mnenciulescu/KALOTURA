'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from 'aws-amplify/auth';
import { Spinner } from '@/components/ui/spinner';
import { MobileShell } from '@/components/layout/mobile-shell';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(() => router.replace('/'))
      .catch(() => setChecking(false));
  }, [router]);

  if (checking) {
    return (
      <MobileShell>
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell>
      <div className="flex flex-1 flex-col overflow-y-auto px-6 py-8">
        {/* Logo */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black tracking-tight" style={{ fontFamily: 'var(--font-jakarta), ui-sans-serif' }}>
            <span className="text-[var(--color-text)]">kalo</span><span className="text-[var(--color-primary)]">tura</span>
          </h1>
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">AI-powered nutrition tracking</p>
        </div>
        {children}
      </div>
    </MobileShell>
  );
}
