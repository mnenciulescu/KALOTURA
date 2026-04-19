'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from 'aws-amplify/auth';
import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@/lib/api';
import { Spinner } from '@/components/ui/spinner';
import { MobileShell } from '@/components/layout/mobile-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    getCurrentUser()
      .then(() => setAuthChecked(true))
      .catch(() => router.replace('/signin'));
  }, [router]);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
    enabled: authChecked,
    retry: false,
  });

  useEffect(() => {
    if (!authChecked || isLoading) return;
    if (!profile?.isAdmin) router.replace('/');
  }, [authChecked, isLoading, profile, router]);

  if (!authChecked || isLoading || !profile?.isAdmin) {
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
      <div className="flex flex-1 flex-col overflow-y-auto no-scrollbar">
        {children}
      </div>
    </MobileShell>
  );
}
