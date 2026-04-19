'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { saveProfile } from '@/lib/api';
import { useAppStore } from '@/lib/store';

type Sex = 'male' | 'female' | 'other';
type FitnessLevel = 'low' | 'medium' | 'high';

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setProfile = useAppStore((s) => s.setProfile);

  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<Sex>('male');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('medium');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: saveProfile,
    onSuccess: (profile) => {
      // Seed the cache so the app layout doesn't see the stale 404 error
      queryClient.setQueryData(['profile'], profile);
      setProfile(profile);
      router.replace('/');
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Failed to save profile'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    mutation.mutate({ fullName, dob, sex, weightKg: Number(weightKg), heightCm: Number(heightCm), fitnessLevel });
  }

  const OptionBtn = ({ value, current, onChange, children }: { value: string; current: string; onChange: (v: string) => void; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`flex-1 py-2.5 text-sm rounded-[var(--radius-sm)] font-medium transition-colors duration-150 ${
        current === value
          ? 'bg-[var(--color-primary)] text-[#080808]'
          : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col gap-6 px-6 py-8 overflow-y-auto no-scrollbar">
      <div>
        <h1 className="text-2xl font-black" style={{ fontFamily: 'var(--font-jakarta), ui-sans-serif' }}>
          <span className="text-[var(--color-text)]">kalo</span><span className="text-[var(--color-primary)]">tura</span>
        </h1>
        <h2 className="mt-4 text-xl font-bold text-[var(--color-text)]">Let&apos;s get to know you</h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">This helps the AI calculate your personal nutrition targets</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Input label="Full Name" type="text" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Input label="Date of Birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Sex</span>
          <div className="flex gap-2">
            <OptionBtn value="male" current={sex} onChange={(v) => setSex(v as Sex)}>Male</OptionBtn>
            <OptionBtn value="female" current={sex} onChange={(v) => setSex(v as Sex)}>Female</OptionBtn>
            <OptionBtn value="other" current={sex} onChange={(v) => setSex(v as Sex)}>Other</OptionBtn>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Weight (kg)" type="number" inputMode="decimal" min="20" max="300" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} required />
          <Input label="Height (cm)" type="number" inputMode="decimal" min="50" max="250" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} required />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Fitness Level</span>
          <div className="flex gap-2">
            <OptionBtn value="low" current={fitnessLevel} onChange={(v) => setFitnessLevel(v as FitnessLevel)}>Low</OptionBtn>
            <OptionBtn value="medium" current={fitnessLevel} onChange={(v) => setFitnessLevel(v as FitnessLevel)}>Medium</OptionBtn>
            <OptionBtn value="high" current={fitnessLevel} onChange={(v) => setFitnessLevel(v as FitnessLevel)}>High</OptionBtn>
          </div>
          <p className="text-[10px] text-[var(--color-text-dim)] mt-1">
            Low = sedentary · Medium = light exercise 1-3×/week · High = intense 4+×/week
          </p>
        </div>

        {error && (
          <p className="rounded-[var(--radius-sm)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full mt-2" loading={mutation.isPending}>
          Save & Continue
        </Button>

        <p className="text-center text-[10px] text-[var(--color-text-dim)]">
          AI targets will be calculated automatically once you add your API key in Settings
        </p>
      </form>
    </div>
  );
}
