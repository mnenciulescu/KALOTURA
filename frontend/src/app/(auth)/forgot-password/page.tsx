'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Step = 'request' | 'confirm';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword({ username: email.trim().toLowerCase() });
      setStep('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmResetPassword({ username: email.trim().toLowerCase(), confirmationCode: code.trim(), newPassword });
      router.replace('/signin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text)]">
          {step === 'request' ? 'Forgot password' : 'Reset password'}
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {step === 'request'
            ? 'Enter your email and we\'ll send you a reset code'
            : `Enter the code sent to ${email}`}
        </p>
      </div>

      <form onSubmit={step === 'request' ? handleRequest : handleConfirm} className="flex flex-col gap-4">
        {step === 'request' ? (
          <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        ) : (
          <>
            <Input label="Verification Code" type="text" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} required />
            <Input label="New Password" type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
          </>
        )}

        {error && (
          <p className="rounded-[var(--radius-sm)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full mt-2" loading={loading}>
          {step === 'request' ? 'Send Reset Code' : 'Set New Password'}
        </Button>
      </form>

      <p className="text-center text-sm">
        <Link href="/signin" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
