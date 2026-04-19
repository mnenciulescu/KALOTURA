export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col overflow-hidden"
      style={{
        background: 'var(--color-bg)',
        boxShadow: '0 0 60px 0 rgba(79,70,229,0.10), 0 8px 32px 0 rgba(15,21,53,0.08)',
      }}
    >
      {children}
    </div>
  );
}
