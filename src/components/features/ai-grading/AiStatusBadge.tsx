'use client';

import { AlertTriangle, Bot, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AiGradingMode, AiGradingStatusRow } from '@/types/ai-grading';

/** Đang xếp hàng hoặc đang chấm — dùng để khoá nút và quyết định có polling hay không. */
export function isAiInFlight(row: AiGradingStatusRow | undefined): boolean {
  return row?.status === 'QUEUED' || row?.status === 'RUNNING';
}

/** Nút "Chấm bằng AI" ở cột Hành động: chạy lại khi đã có bản nháp, khoá khi đang chạy. */
export function AiRowButton({
  row,
  mode,
  requesting,
  onClick,
}: {
  row: AiGradingStatusRow | undefined;
  mode: AiGradingMode | null;
  requesting: boolean;
  onClick: () => void;
}) {
  const busy = requesting || isAiInFlight(row);
  return (
    <Button
      size="sm"
      variant="ghost"
      className="cursor-pointer"
      disabled={busy || mode === 'disabled'}
      onClick={onClick}
      title={
        mode === 'disabled'
          ? 'Chưa cấu hình AI chấm bài trên máy chủ'
          : 'AI đọc bài và đề xuất điểm — bạn duyệt rồi mới lưu'
      }
    >
      {busy ? <Loader2 className="animate-spin" /> : <Bot />}
      {busy ? 'AI đang chấm' : row ? 'Chấm lại AI' : 'Chấm bằng AI'}
    </Button>
  );
}

/**
 * Trạng thái AI của một bài nộp (chip nhỏ trong bảng): đang chờ / đang chấm / có đề xuất /
 * lỗi. Bài chưa từng chấm AI thì không hiện gì.
 */
export default function AiStatusBadge({
  row,
  maxScore,
  className,
}: {
  row: AiGradingStatusRow | undefined;
  maxScore: number;
  className?: string;
}) {
  if (!row) return null;

  if (row.status === 'QUEUED') {
    return (
      <Badge variant="outline" className={cn('gap-1', className)}>
        <Clock className="size-3" aria-hidden /> AI: đang chờ
      </Badge>
    );
  }
  if (row.status === 'RUNNING') {
    return (
      <Badge variant="default" className={cn('gap-1', className)}>
        <Loader2 className="size-3 animate-spin" aria-hidden /> AI: đang chấm
      </Badge>
    );
  }
  if (row.status === 'FAILED') {
    return (
      <Badge
        variant="destructive"
        className={cn('max-w-full gap-1', className)}
        title={row.error ?? 'AI chấm lỗi'}
      >
        <AlertTriangle className="size-3 shrink-0" aria-hidden />
        <span className="truncate">AI: lỗi</span>
      </Badge>
    );
  }

  // DONE
  if (row.stale) {
    return (
      <Badge
        variant="warning"
        className={cn('gap-1', className)}
        title="Học sinh đã nộp lại sau khi AI chấm — đề xuất này không còn khớp bài làm"
      >
        <AlertTriangle className="size-3" aria-hidden /> AI: đề xuất cũ
      </Badge>
    );
  }
  return (
    <Badge
      variant="success"
      className={cn('gap-1', className)}
      title={
        row.usedAnswerKey
          ? 'AI đã chấm theo đáp án / barem'
          : 'Bài chưa có đáp án — AI tự giải đề nên độ tin cậy thấp hơn'
      }
    >
      {row.usedAnswerKey ? (
        <CheckCircle2 className="size-3" aria-hidden />
      ) : (
        <Bot className="size-3" aria-hidden />
      )}
      AI: có đề xuất
      {row.suggestedScore !== null && (
        <span className="tabular-nums">
          {' '}
          · {row.suggestedScore}/{maxScore}
        </span>
      )}
    </Badge>
  );
}
