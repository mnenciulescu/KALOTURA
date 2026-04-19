'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getCurrentUser } from 'aws-amplify/auth';
import { useQuery } from '@tanstack/react-query';
import { BottomNav } from '@/components/layout/bottom-nav';
import { MobileShell } from '@/components/layout/mobile-shell';
import { Toaster } from '@/components/ui/toast';
import { Spinner } from '@/components/ui/spinner';
import { getProfile } from '@/lib/api';
import { useAppStore } from '@/lib/store';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const setProfile = useAppStore((s) => s.setProfile);
  const [authChecked, setAuthChecked] = useState(false);

  const isOnboarding = pathname === '/onboarding';

  useEffect(() => {
    getCurrentUser()
      .then(() => setAuthChecked(true))
      .catch(() => router.replace('/signin'));
  }, [router]);

  const { data: profile, isLoading: profileLoading, isError: profileError } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: authChecked,
    retry: false,
  });

  useEffect(() => {
    if (!authChecked || profileLoading) return;
    // 404 / any error means no profile yet — send to onboarding
    if ((profileError || profile === null) && !isOnboarding) {
      router.replace('/onboarding');
    } else if (profile) {
      setProfile(profile);
    }
  }, [authChecked, profile, profileLoading, profileError, router, setProfile, isOnboarding]);

  const spinner = (
    <MobileShell>
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    </MobileShell>
  );

  if (!authChecked || profileLoading) return spinner;

  if (isOnboarding) {
    return (
      <MobileShell>
        <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar">
          <Toaster />
          {children}
        </div>
      </MobileShell>
    );
  }

  // No profile yet — wait for the effect to redirect to /onboarding
  if (profileError || !profile) return spinner;

  return (
    <MobileShell>
      <div className="flex flex-1 flex-col pb-[72px]">
        <Toaster />
        <main className="flex flex-1 flex-col overflow-y-auto no-scrollbar">
          {children}
        </main>
        <BottomNav />
      </div>
    </MobileShell>
  );
}
