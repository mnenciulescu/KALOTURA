import { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] bg-[var(--color-surface)] border border-[var(--color-border)] p-4',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
