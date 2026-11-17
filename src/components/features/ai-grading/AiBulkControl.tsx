'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2 } from 'lucide-react';
import { requestAiGradingBulkAction } from '@/actions/v1/ai-grading/request-ai-grading';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { handleActionErrors, handleActionSuccess } from '@/lib/actions';
import type { AiGradingStatuses } from './useAiGradingStatuses';

interface Props {
  testId: number;
  statuses: AiGradingStatuses;
  /** Số bài đã nộp nhưng chưa chấm. */
  pendingGradeCount: number;
  /** Số bài đã nộp (kể cả đã chấm). */
  submittedCount: number;
  /** Bài có đáp án / barem — không có thì AI tự giải đề. */
  hasAnswerKey: boolean;
}

/**
 * "Chấm cả lớp bằng AI" + thanh tiến độ. Bấm là tốn tiền cho cả lớp nên luôn qua hộp xác
 * nhận nói rõ AI chỉ ĐỀ XUẤT, không tự lưu điểm và không gửi gì cho học sinh.
 */
export default function AiBulkControl({
  testId,
  statuses,
  pendingGradeCount,
  submittedCount,
  hasAnswerKey,
}: Props) {
  const [open, setOpen] = useState(false);
  const [includeGraded, setIncludeGraded] = useState(false);
  const [redo, setRedo] = useState(false);
  const [sending, setSending] = useState(false);
  // Tổng số bài của lượt "chấm cả lớp" gần nhất — mẫu số của thanh tiến độ.
  const [bulkTotal, setBulkTotal] = useState(0);

  const { inFlight, mode, refresh } = statuses;
  const disabled = mode === 'disabled';

  // Báo một lần khi hàng đợi AI vừa cạn (từ >0 về 0) — admin đang làm việc khác sẽ biết.
  const prevInFlight = useRef(0);
  useEffect(() => {
    if (prevInFlight.current > 0 && inFlight === 0) {
      handleActionSuccess('AI đã chấm xong — mở từng bài để xem đề xuất và duyệt điểm');
      // Hết lượt: bỏ mẫu số cũ để lượt sau (kể cả chấm lẻ từng bài) tính tiến độ từ đầu.
      setBulkTotal(0);
    }
    prevInFlight.current = inFlight;
  }, [inFlight]);

  async function submit() {
    setSending(true);
    try {
      const res = await requestAiGradingBulkAction(testId, { includeGraded, redo });
      if (res.errors.length || !res.result) {
        return handleActionErrors(res.errors.length ? res.errors : ['AI chấm bài thất bại']);
      }
      const r = res.result;
      setOpen(false);
      if (r.queued === 0) {
        handleActionSuccess(
          r.inFlight > 0
            ? 'Các bài còn lại đang được AI chấm'
            : 'Không có bài nào cần AI chấm thêm',
        );
      } else {
        setBulkTotal(r.queued + r.inFlight);
        handleActionSuccess(
          `Đã đưa ${r.queued} bài vào hàng chờ AI${r.overLimit > 0 ? ` (còn ${r.overLimit} bài — bấm lại để chấm tiếp)` : ''}`,
        );
      }
      await refresh();
    } finally {
      setSending(false);
    }
  }

  const total = Math.max(bulkTotal, inFlight);
  const done = Math.max(total - inFlight, 0);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Button
          size="sm"
          variant="outline"
          className="cursor-pointer"
          disabled={disabled || submittedCount === 0}
          onClick={() => setOpen(true)}
          title={disabled ? 'Chưa cấu hình AI (OPENAI_API_KEY) trên máy chủ' : undefined}
        >
          <Bot /> Chấm cả lớp bằng AI
        </Button>
        <p className="text-muted-foreground min-w-0 flex-1 text-xs">
          {mode === 'stub'
            ? 'Chế độ giả lập (máy chủ chưa có OPENAI_API_KEY): điểm AI không phải thật.'
            : mode === 'disabled'
              ? 'Chưa cấu hình AI chấm bài trên máy chủ.'
              : 'AI chỉ đề xuất — bạn duyệt rồi bấm Lưu điểm mới thành điểm chính thức.'}
        </p>
      </div>

      {inFlight > 0 && (
        <div
          className="bg-muted/50 space-y-1.5 rounded-md border p-3"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              AI đang chấm: {done}/{total} bài
            </span>
            <span className="text-muted-foreground text-xs">
              Có thể làm việc khác — kết quả tự cập nhật
            </span>
          </div>
          <Progress value={total ? (done / total) * 100 : 0} aria-label="Tiến độ AI chấm bài" />
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => !sending && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chấm cả lớp bằng AI</DialogTitle>
            <DialogDescription>
              AI chỉ tạo <strong>bản nháp</strong> cho từng bài. Không có điểm nào được lưu và không
              có email nào gửi cho học sinh cho tới khi thầy / cô mở bài, kiểm tra rồi bấm{' '}
              <strong>Lưu điểm</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <p>
              Mặc định chỉ chấm các bài <strong>đã nộp, chưa chấm</strong> và chưa có bản nháp AI
              còn mới ({pendingGradeCount} bài chưa chấm).
            </p>
            {!hasAnswerKey && (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-amber-800">
                Bài này chưa có đáp án / barem — AI sẽ tự giải đề rồi chấm, độ tin cậy thấp hơn. Có
                thể thêm đáp án ở nút <strong>Sửa</strong> của bài.
              </p>
            )}

            <div className="flex items-start gap-3">
              <Checkbox
                id="ai-bulk-graded"
                checked={includeGraded}
                onCheckedChange={(v) => setIncludeGraded(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="ai-bulk-graded" className="cursor-pointer leading-snug font-normal">
                Gồm cả bài <strong>đã chấm</strong> (tốn thêm chi phí; điểm đã lưu không bị đổi)
              </Label>
            </div>
            <div className="flex items-start gap-3">
              <Checkbox
                id="ai-bulk-redo"
                checked={redo}
                onCheckedChange={(v) => setRedo(v === true)}
                className="mt-0.5"
              />
              <Label htmlFor="ai-bulk-redo" className="cursor-pointer leading-snug font-normal">
                Chấm lại cả bài đã có bản nháp AI còn mới
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={sending}
              onClick={() => setOpen(false)}
              className="cursor-pointer"
            >
              Huỷ
            </Button>
            <Button
              type="button"
              disabled={sending}
              onClick={() => void submit()}
              className="cursor-pointer"
            >
              {sending ? 'Đang gửi…' : 'Bắt đầu chấm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
