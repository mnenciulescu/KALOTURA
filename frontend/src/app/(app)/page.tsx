'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SummaryRings } from '@/components/daily-log/summary-rings';
import { BreakdownList } from '@/components/daily-log/breakdown-list';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/toast';
import { getEntry, postEntry } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import { formatDate, isToday, addDays, subDays, localToday } from '@/lib/utils';
import type { DailyEntry } from '@/lib/api';

const STATUS_SEQUENCE = [
  'Connecting to AI model…',
  'Waiting for AI reply…',
  'Processing nutritional data…',
  'Saving your entry…',
];

export default function DailyLogPage() {
  const { profile, selectedDate, setSelectedDate, entry, setEntry } = useAppStore();
  const queryClient = useQueryClient();
  const { add: addToast } = useToast();

  const [text, setText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const statusTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const { data: fetchedEntry, isLoading } = useQuery({
    queryKey: ['entry', selectedDate],
    queryFn: () => getEntry(selectedDate),
    staleTime: 60_000,
  });

  useEffect(() => {
    const e = fetchedEntry ?? null;
    setEntry(e);
    setText(e?.rawText ?? '');
  }, [fetchedEntry, setEntry]);

  function clearStatusTimers() {
    statusTimersRef.current.forEach(clearTimeout);
    statusTimersRef.current = [];
  }

  function startStatusSequence() {
    clearStatusTimers();
    setStatus(STATUS_SEQUENCE[0]);
    STATUS_SEQUENCE.slice(1).forEach((msg, i) => {
      const t = setTimeout(() => setStatus(msg), (i + 1) * 2000);
      statusTimersRef.current.push(t);
    });
  }

  const mutation = useMutation({
    mutationFn: ({ date, rawText }: { date: string; rawText: string }) => postEntry(date, rawText),
    onMutate: () => { startStatusSequence(); },
    onSuccess: (result: DailyEntry) => {
      clearStatusTimers();
      setStatus(null);
      setEntry(result);
      queryClient.setQueryData(['entry', selectedDate], result);
      addToast('Entry updated successfully');
    },
    onError: (e) => {
      clearStatusTimers();
      setStatus(null);
      addToast(e instanceof Error ? e.message : 'Calculation failed', 'error');
    },
  });

  function handleUpdate() {
    if (!text.trim() || mutation.isPending) return;
    mutation.mutate({ date: selectedDate, rawText: text });
  }

  const today = localToday();
  const canGoForward = selectedDate < today;

  return (
    <div className="flex flex-col">
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[var(--color-bg)]/95 backdrop-blur-md border-b border-[var(--color-border)]">
        <button
          onClick={() => setSelectedDate(subDays(selectedDate, 1))}
          className="flex size-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors"
        >
          <ChevronLeft size={20} />
        </button>

        <span className="text-sm font-semibold text-[var(--color-text)]">
          {isToday(selectedDate) ? 'Today' : formatDate(selectedDate)}
        </span>

        <button
          disabled={!canGoForward}
          onClick={() => setSelectedDate(addDays(selectedDate, 1))}
          className="flex size-9 items-center justify-center rounded-full text-[var(--color-text-muted)] hover:bg-[var(--color-surface-2)] transition-colors disabled:opacity-30"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4">
        {/* ─── Summary rings ───────────────────────────────────────────────── */}
        <Card>
          {isLoading ? (
            <div className="flex h-20 items-center justify-center">
              <Spinner className="size-6" />
            </div>
          ) : (
            <SummaryRings
              calories={entry?.totalCalories ?? 0}
              protein={entry?.totalProtein ?? 0}
              fiber={entry?.totalFiber ?? 0}
              carbs={entry?.totalCarbs ?? 0}
              targetCalories={profile?.activeCalories}
              targetProtein={profile?.targetProtein}
              targetFiber={profile?.targetFiber}
              targetCarbs={profile?.targetCarbs}
            />
          )}

        </Card>

        {/* ─── Food entry ──────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {isToday(selectedDate) ? 'What did you eat today?' : formatDate(selectedDate)}
          </span>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 2 scrambled eggs, oatmeal with milk, black coffee, an apple…"
            rows={4}
            className="w-full resize-none rounded-[var(--radius-md)] bg-[var(--color-surface-2)] border border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-dim)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]/30 transition-colors duration-150"
          />

          {/* Status banner */}
          <AnimatePresence>
            {status && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-3 rounded-[var(--radius-sm)] bg-[var(--color-surface-2)] border border-[var(--color-border)] px-4 py-3">
                  <Spinner className="size-4 shrink-0" />
                  <span className="text-sm text-[var(--color-text-muted)]">{status}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            size="lg"
            className="w-full"
            disabled={!text.trim() || mutation.isPending}
            loading={mutation.isPending}
            onClick={handleUpdate}
          >
            Update
          </Button>
        </div>

        {/* ─── Breakdown ───────────────────────────────────────────────────── */}
        {entry && (
          <BreakdownList
            items={entry.items}
            totalCalories={entry.totalCalories}
            totalProtein={entry.totalProtein}
            totalFiber={entry.totalFiber}
            totalCarbs={entry.totalCarbs}
          />
        )}
      </div>
    </div>
  );
}
