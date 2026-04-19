'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { signOut, updatePassword } from 'aws-amplify/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { saveProfile } from '@/lib/api';
import { useAppStore } from '@/lib/store';

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, setProfile } = useAppStore();
  const { add: addToast } = useToast();

  // ─── Profile edit state ──────────────────────────────────────────────
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [weightKg, setWeightKg] = useState(String(profile?.weightKg ?? ''));
  const [heightCm, setHeightCm] = useState(String(profile?.heightCm ?? ''));

  const profileMutation = useMutation({
    mutationFn: saveProfile,
    onSuccess: (updated) => {
      setProfile(updated);
      queryClient.setQueryData(['profile'], updated);
      setEditProfileOpen(false);
      addToast('Profile updated. AI targets recalculated.');
    },
    onError: (e) => addToast(e instanceof Error ? e.message : 'Failed to update profile', 'error'),
  });

  // ─── Change password ─────────────────────────────────────────────────
  const [pwOpen, setPwOpen] = useState(false);
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  async function handleChangePw(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    setPwLoading(true);
    try {
      await updatePassword({ oldPassword: oldPw, newPassword: newPw });
      setPwOpen(false);
      setOldPw(''); setNewPw('');
      addToast('Password changed');
    } catch (err) {
      setPwError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  }

  // ─── Sign out ────────────────────────────────────────────────────────
  async function handleSignOut() {
    await signOut();
    router.replace('/signin');
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[var(--color-border)]">
        <h1 className="text-base font-bold text-[var(--color-text)]">Settings</h1>
      </div>

      <div className="flex flex-col gap-5 px-4 py-4">

        {/* ─── Profile ──────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Profile</h2>
          <Card>
            {profile && (
              <div className="mb-4 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                <span className="text-[var(--color-text-muted)]">Name</span>
                <span className="text-[var(--color-text)] font-medium text-right">{profile.fullName}</span>
                <span className="text-[var(--color-text-muted)]">Weight</span>
                <span className="text-[var(--color-text)] font-medium text-right">{profile.weightKg} kg</span>
                <span className="text-[var(--color-text-muted)]">Height</span>
                <span className="text-[var(--color-text)] font-medium text-right">{profile.heightCm} cm</span>
                <span className="text-[var(--color-text-muted)]">Fitness</span>
                <span className="text-[var(--color-text)] font-medium text-right capitalize">{profile.fitnessLevel}</span>
              </div>
            )}
            <Button variant="secondary" size="md" className="w-full" onClick={() => setEditProfileOpen(true)}>
              Edit Profile
            </Button>
          </Card>
        </section>

        {/* ─── Admin Space (admin users only) ──────────────────────────── */}
        {profile?.isAdmin && (
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Admin</h2>
            <Card>
              <Button variant="secondary" size="md" className="w-full" onClick={() => router.push('/admin')}>
                Admin Space
              </Button>
            </Card>
          </section>
        )}

        {/* ─── Account ──────────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Account</h2>
          <Card className="flex flex-col gap-2">
            <Button variant="secondary" size="md" className="w-full" onClick={() => setPwOpen(true)}>
              Change Password
            </Button>
            <Button variant="ghost" size="md" className="w-full" onClick={handleSignOut}>
              Sign Out
            </Button>
          </Card>
        </section>
      </div>

      {/* ─── Edit Profile dialog ───────────────────────────────────────── */}
      <Dialog open={editProfileOpen} onClose={() => setEditProfileOpen(false)} title="Edit Profile">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            profileMutation.mutate({ fullName, weightKg: Number(weightKg), heightCm: Number(heightCm) });
          }}
          className="flex flex-col gap-4"
        >
          <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Weight (kg)" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} required />
            <Input label="Height (cm)" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} required />
          </div>
          <Button type="submit" size="lg" className="w-full" loading={profileMutation.isPending}>
            Save Changes
          </Button>
        </form>
      </Dialog>

      {/* ─── Change Password dialog ────────────────────────────────────── */}
      <Dialog open={pwOpen} onClose={() => { setPwOpen(false); setPwError(''); }} title="Change Password">
        <form onSubmit={handleChangePw} className="flex flex-col gap-4">
          <Input label="Current Password" type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} required />
          <Input label="New Password" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
          {pwError && (
            <p className="text-sm text-[var(--color-danger)]">{pwError}</p>
          )}
          <Button type="submit" size="lg" className="w-full" loading={pwLoading}>
            Update Password
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
