'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp, confirmSignUp, resendSignUpCode } from 'aws-amplify/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Step = 'register' | 'verify';

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('register');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) return setError('Passwords do not match');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true);
    try {
      await signUp({ username: email.trim().toLowerCase(), password, options: { userAttributes: { email } } });
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmSignUp({ username: email.trim().toLowerCase(), confirmationCode: code.trim() });
      router.replace('/signin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      await resendSignUpCode({ username: email.trim().toLowerCase() });
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resend failed');
    }
  }

  if (step === 'verify') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text)]">Check your email</h2>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            We sent a 6-digit code to <strong className="text-[var(--color-text)]">{email}</strong>
          </p>
        </div>

        <form onSubmit={handleVerify} className="flex flex-col gap-4">
          <Input
            label="Verification Code"
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
          {error && (
            <p className="rounded-[var(--radius-sm)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 px-4 py-3 text-sm text-[var(--color-danger)]">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full mt-2" loading={loading}>
            Verify Account
          </Button>
        </form>

        <button
          onClick={handleResend}
          className="text-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
        >
          Didn&apos;t receive the code? Resend
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-[var(--color-text)]">Create account</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">Start tracking your nutrition</p>
      </div>

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <Input label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input label="Password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <Input label="Confirm Password" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />

        {error && (
          <p className="rounded-[var(--radius-sm)] bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 px-4 py-3 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full mt-2" loading={loading}>
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-[var(--color-text-muted)]">
        Already have an account?{' '}
        <Link href="/signin" className="text-[var(--color-primary)] font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
