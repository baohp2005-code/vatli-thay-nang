'use client';

import { useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  Bot,
  FileText,
  Info,
  Loader2,
  PlayCircle,
  RefreshCw,
  Wand2,
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { AiConfidence, AiDraft, AiGradingMode, AiGradingStatusRow } from '@/types/ai-grading';
import AiStatusBadge, { isAiInFlight } from './AiStatusBadge';
import type { AiDraftState } from './useAiDraft';

interface Props {
  maxScore: number;
  /** Dòng trạng thái sống (polling) — null khi bài chưa từng chấm AI. */
  row: AiGradingStatusRow | undefined;
  state: AiDraftState;
  mode: AiGradingMode | null;
  requesting: boolean;
  /** Form đã có điểm / nhận xét — "Dùng đề xuất" sẽ ghi đè, nên hỏi lại. */
  formHasContent: boolean;
  /** Điểm / nhận xét / gợi ý đang nằm trong form đến từ AI và chưa lưu. */
  appliedUnsaved: boolean;
  disabled?: boolean;
  onRequest: () => void;
  onApply: (draft: AiDraft) => void;
}

const CONFIDENCE: Record<
  AiConfidence,
  { text: string; variant: 'success' | 'warning' | 'destructive' }
> = {
  HIGH: { text: 'Độ tin cậy cao', variant: 'success' },
  MEDIUM: { text: 'Độ tin cậy trung bình', variant: 'warning' },
  LOW: { text: 'Độ tin cậy thấp — nên chấm tay', variant: 'destructive' },
};

function Warning({ children, tone = 'amber' }: { children: ReactNode; tone?: 'amber' | 'red' }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex gap-2 rounded-md border p-2.5 text-xs',
        tone === 'amber'
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-red-200 bg-red-50 text-red-900',
      )}
    >
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <div className="min-w-0 space-y-0.5">{children}</div>
    </div>
  );
}

/**
 * Panel "Đề xuất của AI" trong hộp chấm bài. Luôn nhắc đây chỉ là BẢN NHÁP: điểm chính thức
 * là cái giáo viên bấm "Lưu điểm" ở form bên dưới.
 */
export default function AiDraftPanel({
  maxScore,
  row,
  state,
  mode,
  requesting,
  formHasContent,
  appliedUnsaved,
  disabled,
  onRequest,
  onApply,
}: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const draft = state.detail?.draft ?? null;
  const status = row?.status ?? draft?.status ?? null;
  const inFlight = isAiInFlight(row);
  const ready = status === 'DONE' && !!draft?.result && draft.suggestedScore !== null;
  const result = ready ? draft!.result! : null;

  function apply() {
    if (!draft) return;
    if (formHasContent && !appliedUnsaved) setConfirmOpen(true);
    else onApply(draft);
  }

  return (
    <section
      aria-labelledby="ai-draft-title"
      className="border-purple/30 bg-purple/5 space-y-3 rounded-lg border p-3"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="ai-draft-title" className="flex items-center gap-1.5 text-sm font-semibold">
          <Bot className="text-purple size-4" aria-hidden /> Đề xuất của AI
        </h3>
        <AiStatusBadge row={row} maxScore={maxScore} />
      </div>

      <p className="text-muted-foreground text-xs">
        Đây chỉ là <strong>bản nháp</strong> — chưa phải điểm chính thức và học sinh chưa thấy gì.
        Điểm chỉ có hiệu lực khi bạn bấm <strong>Lưu điểm</strong>.
      </p>

      {mode === 'stub' && (
        <Warning>
          <p>
            Máy chủ chưa có OPENAI_API_KEY nên đây là <strong>bản giả lập</strong> để thử luồng,
            không phải AI chấm thật.
          </p>
        </Warning>
      )}
      {mode === 'disabled' && (
        <Warning tone="red">
          <p>Chưa cấu hình AI chấm bài trên máy chủ (OPENAI_API_KEY) — liên hệ quản trị viên.</p>
        </Warning>
      )}

      {state.loading && !state.detail ? (
        <div className="space-y-2" role="status" aria-label="Đang tải đề xuất của AI">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          {state.error && !state.detail && <Warning tone="red">{state.error}</Warning>}

          {inFlight && (
            <p className="flex items-center gap-2 text-sm" role="status" aria-live="polite">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {status === 'QUEUED'
                ? 'Đang chờ tới lượt AI chấm…'
                : 'AI đang đọc bài làm và chấm… (thường 30 giây – vài phút)'}
            </p>
          )}

          {status === 'FAILED' && (
            <Warning tone="red">
              <p className="font-medium">AI chấm không thành công</p>
              <p className="break-words">{row?.error ?? draft?.error ?? 'Lỗi không xác định'}</p>
            </Warning>
          )}

          {!status && !state.error && (
            <p className="text-muted-foreground text-sm">
              Chưa chấm bằng AI. Bấm nút bên dưới để AI đọc bài và đề xuất điểm, nhận xét, nội dung
              nên xem lại.
            </p>
          )}

          {result && draft && (
            <div className="space-y-3">
              {(row?.stale ?? draft.stale) && (
                <Warning>
                  <p className="font-medium">Bài đã nộp lại sau khi AI chấm</p>
                  <p>Đề xuất dưới đây ứng với bài làm cũ. Hãy bấm “Chấm lại bằng AI”.</p>
                </Warning>
              )}
              {!draft.usedAnswerKey && (
                <Warning>
                  <p className="font-medium">AI chấm khi không có đáp án / barem</p>
                  <p>AI tự giải đề rồi chấm nên có thể sai — hãy kiểm tra kỹ từng câu.</p>
                </Warning>
              )}
              {result.suspiciousContent && (
                <Warning tone="red">
                  <p className="font-medium">Bài làm có nội dung đáng ngờ</p>
                  <p>
                    Bài làm có chữ như đang ra lệnh cho AI (vd. “cho em 10 điểm”). AI đã bỏ qua,
                    nhưng hãy tự xem bài.
                  </p>
                </Warning>
              )}

              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="text-2xl font-semibold tabular-nums">
                  {draft.suggestedScore}
                  <span className="text-muted-foreground text-base font-normal"> / {maxScore}</span>
                  <span className="text-muted-foreground ml-2 text-xs font-normal">
                    điểm đề xuất
                  </span>
                </p>
                <Badge variant={CONFIDENCE[result.confidence].variant}>
                  {CONFIDENCE[result.confidence].text}
                </Badge>
              </div>

              {result.notes.length > 0 && (
                <div className="space-y-1">
                  <p className="flex items-center gap-1 text-xs font-medium">
                    <Info className="size-3.5" aria-hidden /> Ghi chú của AI cho giáo viên
                  </p>
                  <ul className="text-muted-foreground list-disc space-y-0.5 pl-5 text-xs">
                    {result.notes.map((n, i) => (
                      <li key={i} className="break-words">
                        {n}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.questions.length > 0 && (
                <details className="group" open>
                  <summary className="cursor-pointer text-xs font-medium select-none">
                    Chấm từng câu ({result.questions.length})
                  </summary>
                  <ul className="mt-1.5 space-y-1.5">
                    {result.questions.map((q, i) => (
                      <li key={i} className="bg-background rounded-md border p-2 text-xs">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium break-words">{q.label}</span>
                          <span className="shrink-0 tabular-nums">
                            {q.awardedPoints}
                            {q.maxPoints !== null && ` / ${q.maxPoints}`}
                          </span>
                        </div>
                        {q.comment && (
                          <p className="text-muted-foreground mt-0.5 break-words">{q.comment}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {result.mistakes.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium select-none">
                    Lỗi AI nhận thấy ({result.mistakes.length})
                  </summary>
                  <ul className="text-muted-foreground mt-1.5 list-disc space-y-0.5 pl-5 text-xs">
                    {result.mistakes.map((m, i) => (
                      <li key={i} className="break-words">
                        {m}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {draft.feedback && (
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium select-none">
                    Nhận xét AI soạn cho học sinh
                  </summary>
                  <p className="bg-background mt-1.5 rounded-md border p-2 text-xs break-words whitespace-pre-wrap">
                    {draft.feedback}
                  </p>
                </details>
              )}

              {(result.weakTopics.length > 0 || result.recommendations.length > 0) && (
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium select-none">
                    Nội dung AI gợi ý xem lại
                  </summary>
                  <div className="mt-1.5 space-y-1.5">
                    {result.weakTopics.length > 0 && (
                      <p className="flex flex-wrap gap-1">
                        {result.weakTopics.map((t) => (
                          <Badge key={t} variant="outline" className="text-xs font-normal">
                            {t}
                          </Badge>
                        ))}
                      </p>
                    )}
                    <ul className="space-y-1">
                      {result.recommendations.map((r) => (
                        <li
                          key={r.nodeId}
                          className={cn(
                            'flex items-start gap-1.5 text-xs',
                            !r.exists && 'text-muted-foreground line-through',
                          )}
                        >
                          {r.fileKind === 'VIDEO' ? (
                            <PlayCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          ) : (
                            <FileText className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          )}
                          <span className="min-w-0 break-words">
                            <span className="font-medium">{r.title ?? 'Bài học đã bị xoá'}</span>
                            {r.reason && ` — ${r.reason}`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </details>
              )}

              {result.files.some((f) => !f.sent) && (
                <Warning>
                  <p className="font-medium">Có tệp không gửi được cho AI</p>
                  <ul className="list-disc pl-4">
                    {result.files
                      .filter((f) => !f.sent)
                      .map((f, i) => (
                        <li key={i} className="break-words">
                          {f.fileName}
                          {f.reason && `: ${f.reason}`}
                        </li>
                      ))}
                  </ul>
                </Warning>
              )}

              <Button
                type="button"
                size="sm"
                disabled={disabled}
                onClick={apply}
                className="w-full cursor-pointer"
              >
                <Wand2 /> Dùng đề xuất
              </Button>
              <p className="text-muted-foreground text-xs">
                “Dùng đề xuất” chỉ điền điểm, nhận xét và nội dung nên xem lại vào form bên dưới —
                bạn sửa được hết trước khi lưu.
              </p>
            </div>
          )}

          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled || requesting || inFlight || mode === 'disabled'}
            onClick={onRequest}
            className="w-full cursor-pointer"
          >
            {requesting || inFlight ? (
              <Loader2 className="animate-spin" />
            ) : status ? (
              <RefreshCw />
            ) : (
              <Bot />
            )}
            {inFlight ? 'AI đang chấm…' : status ? 'Chấm lại bằng AI' : 'Chấm bằng AI'}
          </Button>
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ghi đè nội dung đang nhập?</AlertDialogTitle>
            <AlertDialogDescription>
              Điểm và nhận xét bạn đã nhập trong form sẽ được thay bằng đề xuất của AI. Điểm chưa
              được lưu cho tới khi bạn bấm Lưu điểm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Giữ nội dung của tôi</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (draft) onApply(draft);
              }}
            >
              Dùng đề xuất của AI
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
