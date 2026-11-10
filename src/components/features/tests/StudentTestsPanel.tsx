'use client';

import { type KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, ClipboardList, Clock } from 'lucide-react';
import { listTests } from '@/actions/v1/tests/list-tests';
import EmptyState from '@/components/app/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { handleActionErrors } from '@/lib/actions';
import { formatDateTimeShort } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { StudentTestRow, TestPhase } from '@/types/tests';
import StudentTestDetail from './StudentTestDetail';

interface Props {
  courseId: number;
  openTestId: number | null;
  onOpenTestChange: (testId: number | null) => void;
}

const PHASE: Record<TestPhase, { text: string; variant: 'secondary' | 'default' | 'outline' }> = {
  SCHEDULED: { text: 'Sắp diễn ra', variant: 'outline' },
  ONGOING: { text: 'Đang mở', variant: 'default' },
  ENDED: { text: 'Đã kết thúc', variant: 'secondary' },
};

function formatRange(start: string, end: string): string {
  return `${formatDateTimeShort(start)} → ${formatDateTimeShort(end)}`;
}

/** Trạng thái bài của chính mình. Điểm chỉ lộ khi bài đã kết thúc VÀ đã chấm (BE chốt). */
function myStatusText(t: StudentTestRow, maxScore: number): string {
  if (t.myScore !== null) return `${t.myScore}/${maxScore} điểm`;
  if (t.mySubmissionStatus === 'NOT_SUBMITTED') return 'Chưa nộp';
  return 'Đã nộp';
}

/** Chỉ báo hạn nộp khi còn dưới 24 giờ — sớm hơn thì hiện ra chỉ gây nhiễu, không giúp
 * học sinh quyết định gì cả (khác gì hiện ngày kết thúc đã có sẵn ở dòng trên). */
function CountdownBadge({ endTime }: { endTime: string }) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    function tick() {
      const totalMinutes = Math.floor((new Date(endTime).getTime() - Date.now()) / 60_000);
      if (totalMinutes <= 0 || totalMinutes >= 24 * 60) {
        setLabel(null);
        return;
      }
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      setLabel(hours > 0 ? `Còn ${hours} giờ ${minutes} phút` : `Còn ${minutes} phút`);
    }
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [endTime]);

  if (!label) return null;
  return (
    <Badge variant="warning" className="gap-1">
      <Clock className="size-3" /> {label}
    </Badge>
  );
}

export default function StudentTestsPanel({ courseId, openTestId, onOpenTestChange }: Props) {
  const [tests, setTests] = useState<StudentTestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);

  const load = useCallback(async (): Promise<boolean> => {
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;

    const res = await listTests<StudentTestRow>(courseId);
    if (!mountedRef.current || requestSeqRef.current !== seq) return false;

    if (res.errors.length) handleActionErrors(res.errors);
    setTests(res.data);
    setLoading(false);
    return !res.errors.length;
  }, [courseId]);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
      requestSeqRef.current += 1;
    };
  }, [load]);

  function openTest(id: number) {
    onOpenTestChange(id);
  }

  function handleCardKeyDown(e: KeyboardEvent<HTMLDivElement>, id: number) {
    if (e.key === 'Enter') openTest(id);
    if (e.key === ' ') e.preventDefault();
  }

  function handleCardKeyUp(e: KeyboardEvent<HTMLDivElement>, id: number) {
    if (e.key === ' ') openTest(id);
  }

  if (openTestId !== null) {
    return (
      <StudentTestDetail
        courseId={courseId}
        testId={openTestId}
        onBack={() => {
          onOpenTestChange(null);
          void load();
        }}
      />
    );
  }

  if (loading) {
    return (
      <ul className="space-y-2" role="status" aria-label="Đang tải danh sách bài kiểm tra">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i}>
            <Card>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    );
  }

  if (tests.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Chưa có bài kiểm tra"
        description="Khi giáo viên ra đề, bài kiểm tra sẽ xuất hiện ở đây."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {tests.map((t) => {
        const phase = PHASE[t.phase];
        const submitted = t.mySubmissionStatus !== 'NOT_SUBMITTED';
        return (
          <li key={t.id}>
            <Card
              role="button"
              tabIndex={0}
              aria-label={`Mở bài kiểm tra ${t.title}`}
              onClick={() => openTest(t.id)}
              onKeyDown={(e) => handleCardKeyDown(e, t.id)}
              onKeyUp={(e) => handleCardKeyUp(e, t.id)}
              className={cn(
                'hover:border-purple focus-visible:ring-ring/50 cursor-pointer border-l-4 transition outline-none focus-visible:ring-[3px]',
                // Bài đang mở là việc cần làm ngay — viền trái nổi bật để mắt rơi đúng chỗ
                // giữa một danh sách nhiều bài đã kết thúc/sắp diễn ra.
                t.phase === 'ONGOING' ? 'border-l-purple' : 'border-l-transparent',
              )}
            >
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{t.title}</p>
                  <p className="text-muted-foreground text-sm">
                    {formatRange(t.startTime, t.endTime)}
                    <span aria-hidden className="mx-1.5">
                      ·
                    </span>
                    {t.type === 'HOMEWORK' ? 'Bài tập' : `Làm bài ${t.durationMinutes} phút`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {t.phase === 'ONGOING' && <CountdownBadge endTime={t.endTime} />}
                  <span
                    className={cn(
                      'flex items-center gap-1 text-sm',
                      t.myScore !== null
                        ? 'text-foreground font-semibold tabular-nums'
                        : 'text-muted-foreground',
                    )}
                  >
                    {submitted ? (
                      <CheckCircle2 className="size-3.5 text-green-600" />
                    ) : (
                      <Circle className="text-muted-foreground/50 size-3.5" />
                    )}
                    {myStatusText(t, t.maxScore)}
                  </span>
                  <Badge variant={phase.variant}>{phase.text}</Badge>
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
