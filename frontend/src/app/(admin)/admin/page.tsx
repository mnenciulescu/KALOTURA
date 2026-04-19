'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Shield, ShieldOff, KeyRound, Pencil, Eye, EyeOff } from 'lucide-react';
import { getAdminUsers, deleteAdminUser, setAdminUserRole, setAdminUserAi } from '@/lib/api';
import type { AdminUser, AiSettingsPayload } from '@/lib/api';

type Provider = 'openai' | 'anthropic' | 'custom';
const DEFAULT_MODEL: Record<Provider, string> = { openai: 'gpt-4o', anthropic: 'claude-sonnet-4-6', custom: '' };

function AiEditModal({ user, onClose, onSave, isPending }: {
  user: AdminUser;
  onClose: () => void;
  onSave: (payload: AiSettingsPayload) => void;
  isPending: boolean;
}) {
  const [provider, setProvider] = useState<Provider>((user.aiProvider as Provider) ?? 'openai');
  const [model, setModel] = useState(user.aiModel ?? DEFAULT_MODEL[provider]);
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [showKey, setShowKey] = useState(false);

  function handleProviderChange(p: Provider) {
    setProvider(p);
    if (!model || Object.values(DEFAULT_MODEL).includes(model)) setModel(DEFAULT_MODEL[p]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-[430px] rounded-t-2xl bg-[var(--color-bg)] p-6 pb-10 shadow-xl">
        <h2 className="mb-0.5 text-base font-bold text-[var(--color-text)]">Edit AI Settings</h2>
        <p className="mb-5 text-xs text-[var(--color-text-muted)]">{user.fullName}</p>

        {/* Provider */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Provider</label>
          <div className="flex gap-2">
            {(['openai', 'anthropic', 'custom'] as Provider[]).map((p) => (
              <button key={p} type="button" onClick={() => handleProviderChange(p)}
                className={`flex-1 rounded-[var(--radius-sm)] py-2.5 text-sm font-medium transition-colors ${
                  provider === p
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                }`}>
                {p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Model</label>
          <input value={model} onChange={(e) => setModel(e.target.value)}
            placeholder={DEFAULT_MODEL[provider] || 'e.g. llama-3.3-70b'}
            className="w-full h-12 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30" />
        </div>

        {/* API Key */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">API Key</label>
          <div className="relative">
            <input type={showKey ? 'text' : 'password'} value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              placeholder={user.aiKeyHint ? `Current key ends in …${user.aiKeyHint}` : 'Paste API key'}
              className="w-full h-12 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 pr-12 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30" />
            <button type="button" onClick={() => setShowKey((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {provider === 'custom' && (
          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Base URL</label>
            <input type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://your-provider.com/v1"
              className="w-full h-12 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/30" />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose}
            className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] py-3 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave({ provider, model, ...(apiKey ? { apiKey } : {}), ...(baseUrl ? { baseUrl } : {}) })}
            disabled={isPending}
            className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-primary)] py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50">
            {isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ user, onClose, onConfirm, isPending }: {
  user: AdminUser;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-[430px] rounded-t-2xl bg-[var(--color-bg)] p-6 pb-10 shadow-xl">
        <h2 className="mb-1 text-base font-bold text-[var(--color-text)]">Delete user?</h2>
        <p className="mb-6 text-sm text-[var(--color-text-muted)]">
          All data for <span className="font-semibold text-[var(--color-text)]">{user.fullName}</span> will be permanently deleted.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 rounded-[var(--radius-md)] border border-[var(--color-border)] py-3 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 rounded-[var(--radius-md)] bg-[var(--color-danger)] py-3 text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50">
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

function UserCard({ user, onEditAi, onToggleRole, onDelete, roleLoading }: {
  user: AdminUser;
  onEditAi: () => void;
  onToggleRole: () => void;
  onDelete: () => void;
  roleLoading: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--color-surface)] border border-[var(--color-border)] px-4 py-3">
      {/* Top row: name + badges */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-[var(--color-text)] truncate">{user.fullName}</p>
          <p className="text-xs text-[var(--color-text-muted)] truncate">{user.email ?? user.userId.slice(0, 12) + '…'}</p>
        </div>
        <div className="flex shrink-0 gap-1.5 items-center">
          {user.isAdmin && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary)]">
              <Shield size={9} /> Admin
            </span>
          )}
          {user.hasAiKey && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-success)] capitalize">
              <KeyRound size={9} /> {user.aiProvider}
            </span>
          )}
        </div>
      </div>

      {/* Meta row */}
      <div className="flex gap-4 text-[11px] text-[var(--color-text-dim)] mb-3">
        <span>Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
        <span>{user.entryCount} {user.entryCount === 1 ? 'entry' : 'entries'}</span>
        {user.aiModel && <span>{user.aiModel}</span>}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={onEditAi}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] border border-[var(--color-border)] py-2 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
          <Pencil size={12} /> AI Key
        </button>
        {!user.protected && (
          <button onClick={onToggleRole} disabled={roleLoading}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] border border-[var(--color-border)] py-2 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors disabled:opacity-40">
            {user.isAdmin ? <><ShieldOff size={12} /> Remove Admin</> : <><Shield size={12} /> Make Admin</>}
          </button>
        )}
        <button onClick={onDelete}
          className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] hover:border-[var(--color-danger)]/30 transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<AdminUser | null>(null);
  const [editAi, setEditAi] = useState<AdminUser | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: getAdminUsers,
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: string) => deleteAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setConfirmDelete(null);
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) =>
      setAdminUserRole(userId, isAdmin),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminUsers'] }),
  });

  const aiMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: AiSettingsPayload }) =>
      setAdminUserAi(userId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      setEditAi(null);
    },
  });

  const totalEntries = users.reduce((sum, u) => sum + u.entryCount, 0);
  const usersWithAi = users.filter((u) => u.hasAiKey).length;

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[var(--color-border)]">
        <button onClick={() => router.push('/settings')}
          className="flex size-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-sm font-bold text-[var(--color-text)]">Admin Space</h1>
          <p className="text-[10px] text-[var(--color-text-muted)]">{users.length} users · {totalEntries} entries · {usersWithAi} AI keys</p>
        </div>
      </div>

      {/* User cards */}
      <div className="flex flex-col gap-3 px-4 py-4">
        {isLoading ? (
          <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="py-12 text-center text-sm text-[var(--color-text-muted)]">No users found</p>
        ) : (
          users.map((user) => (
            <UserCard
              key={user.userId}
              user={user}
              onEditAi={() => setEditAi(user)}
              onToggleRole={() => roleMutation.mutate({ userId: user.userId, isAdmin: !user.isAdmin })}
              onDelete={() => setConfirmDelete(user)}
              roleLoading={roleMutation.isPending}
            />
          ))
        )}
      </div>

      {editAi && (
        <AiEditModal
          user={editAi}
          onClose={() => setEditAi(null)}
          onSave={(payload) => aiMutation.mutate({ userId: editAi.userId, payload })}
          isPending={aiMutation.isPending}
        />
      )}

      {confirmDelete && (
        <DeleteModal
          user={confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => deleteMutation.mutate(confirmDelete.userId)}
          isPending={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
