'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { FoodItem } from '@/lib/api';
import { cn } from '@/lib/utils';

interface MacroRowProps {
  label: string;
  value: number;
  unit: string;
  color: string;
}

function MacroRow({ label, value, unit, color }: MacroRowProps) {
  return (
    <div className="flex items-center justify-between text-xs py-0.5">
      <span className="text-[var(--color-text-muted)]">{label}</span>
      <span className="font-medium" style={{ color }}>{value} {unit}</span>
    </div>
  );
}

function FoodCard({ item }: { item: FoodItem }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-border)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronRight
            size={14}
            className={cn('shrink-0 text-[var(--color-text-dim)] transition-transform duration-200', open && 'rotate-90')}
          />
          <span className="truncate text-sm text-[var(--color-text)]">{item.name}</span>
        </div>
        <span className="ml-3 shrink-0 text-sm font-semibold text-[var(--color-calories)]">
          {item.calories} kcal
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--color-border)] px-4 py-3 space-y-1">
              <MacroRow label="Protein"       value={item.protein}       unit="g" color="var(--color-protein)" />
              <MacroRow label="Fiber"         value={item.fiber}         unit="g" color="var(--color-fiber)" />
              <MacroRow label="Carbs"         value={item.carbs}         unit="g" color="var(--color-carbs)" />
              <MacroRow label="Healthy Fats"  value={item.healthyFats ?? 0}   unit="g" color="var(--color-healthy-fats)" />
              <MacroRow label="Unhlthy Fats"  value={item.unhealthyFats ?? 0} unit="g" color="var(--color-unhealthy-fats)" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface BreakdownListProps {
  items: FoodItem[];
  totalCalories: number;
  totalProtein: number;
  totalFiber: number;
  totalCarbs: number;
}

export function BreakdownList({ items }: BreakdownListProps) {
  if (!items.length) return null;

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <FoodCard key={i} item={item} />
      ))}
    </div>
  );
}
