'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { signOut, updatePassword } from 'aws-amplify/auth';
import { Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/toast';
import { getAiSettings, saveAiSettings, saveProfile, getProfile } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import type { AiSettings } from '@/lib/api';

type Provider = 'openai' | 'anthropic' | 'custom';

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, setProfile } = useAppStore();
  const { add: addToast } = useToast();

  // ─── AI Settings state ───────────────────────────────────────────────
  const [provider, setProvider] = useState<Provider>('openai');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [keyHint, setKeyHint] = useState<string | undefined>();

  const { data: aiSettings } = useQuery({ queryKey: ['aiSettings'], queryFn: getAiSettings });

  useEffect(() => {
    if (!aiSettings) return;
    setProvider(aiSettings.provider);
    setModel(aiSettings.model);
    setBaseUrl(aiSettings.baseUrl ?? '');
    setKeyHint(aiSettings.keyHint);
  }, [aiSettings]);

  const aiMutation = useMutation({
    mutationFn: async (payload: Parameters<typeof saveAiSettings>[0]) => {
      const ai = await saveAiSettings(payload);
      // Recalculate targets immediately using the new AI key + existing profile data
      if (profile) {
        const updated = await saveProfile({
          fullName: profile.fullName,
          dob: profile.dob,
          sex: profile.sex,
          weightKg: profile.weightKg,
          heightCm: profile.heightCm,
          fitnessLevel: profile.fitnessLevel,
        });
        return { ai, profile: updated };
      }
      return { ai, profile: null };
    },
    onSuccess: ({ ai, profile: updated }) => {
      queryClient.setQueryData(['aiSettings'], ai);
      setKeyHint(ai.keyHint);
      setApiKey('');
      if (updated) {
        queryClient.setQueryData(['profile'], updated);
        setProfile(updated);
        addToast('AI settings saved — daily targets calculated');
      } else {
        addToast('AI settings saved');
      }
    },
    onError: (e) => addToast(e instanceof Error ? e.message : 'Failed to save AI settings', 'error'),
  });

  function handleSaveAi(e: React.FormEvent) {
    e.preventDefault();
    const payload: Parameters<typeof saveAiSettings>[0] = {
      provider, model,
      ...(baseUrl ? { baseUrl } : {}),
      ...(apiKey ? { apiKey } : {}),
    };
    aiMutation.mutate(payload);
  }

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

  const defaultModel: Record<Provider, string> = {
    openai: 'gpt-4o',
    anthropic: 'claude-sonnet-4-6',
    custom: '',
  };

  function handleProviderChange(p: Provider) {
    setProvider(p);
    if (!model || Object.values(defaultModel).includes(model)) {
      setModel(defaultModel[p]);
    }
  }

  const ProviderBtn = ({ value, label }: { value: Provider; label: string }) => (
    <button
      type="button"
      onClick={() => handleProviderChange(value)}
      className={`flex-1 py-2.5 text-sm rounded-[var(--radius-sm)] font-medium transition-colors duration-150 ${
        provider === value
          ? 'bg-[var(--color-primary)] text-[#080808]'
          : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 py-3 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[var(--color-border)]">
        <h1 className="text-base font-bold text-[var(--color-text)]">Settings</h1>
      </div>

      <div className="flex flex-col gap-5 px-4 py-4">

        {/* ─── AI Configuration ─────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">AI Configuration</h2>
          <Card>
            <form onSubmit={handleSaveAi} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Provider</span>
                <div className="flex gap-2">
                  <ProviderBtn value="openai" label="OpenAI" />
                  <ProviderBtn value="anthropic" label="Anthropic" />
                  <ProviderBtn value="custom" label="Custom" />
                </div>
              </div>

              <Input
                label="Model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={defaultModel[provider] || 'e.g. llama-3.3-70b'}
                required
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={keyHint ? `••••••••••••${keyHint}` : 'Paste your API key'}
                    className="w-full h-12 pl-4 pr-12 rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] text-sm placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-colors duration-150"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]"
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {keyHint && !apiKey && (
                  <p className="text-[10px] text-[var(--color-text-dim)]">Current key ends in …{keyHint}. Enter a new key to replace it.</p>
                )}
              </div>

              {provider === 'custom' && (
                <Input
                  label="Base URL"
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://your-provider.com/v1"
                />
              )}

              <Button type="submit" size="lg" className="w-full" loading={aiMutation.isPending}>
                Save AI Settings
              </Button>
            </form>
          </Card>
        </section>

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
