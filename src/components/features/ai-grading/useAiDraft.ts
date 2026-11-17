'use client';

import { useEffect, useState } from 'react';
import { getAiDraft } from '@/actions/v1/ai-grading/get-ai-grading';
import type { AiDraftDetail } from '@/types/ai-grading';

export interface AiDraftState {
  detail: AiDraftDetail | null;
  /** Đang tải lần đầu — chưa biết có bản nháp / gợi ý đã duyệt hay không. */
  loading: boolean;
  error: string | null;
}

/**
 * Bản nháp AI đầy đủ + gợi ý ôn tập đã duyệt của một bài. Tải lại mỗi khi `version` đổi —
 * truyền dấu thời gian cập nhật của dòng trạng thái AI để dialog đang mở tự nhận kết quả khi
 * AI vừa chấm xong, không phải đóng mở lại.
 */
export function useAiDraft(
  testId: number,
  studentId: number,
  enabled: boolean,
  version: string | null,
): AiDraftState {
  const [state, setState] = useState<AiDraftState>({
    detail: null,
    loading: enabled,
    error: null,
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void getAiDraft(testId, studentId).then((res) => {
      if (cancelled) return;
      // Lỗi lúc làm mới thì giữ dữ liệu đã có, chỉ báo lỗi.
      setState((prev) => ({
        detail: res.data ?? prev.detail,
        loading: false,
        error: res.data ? null : (res.errors[0] ?? 'Không lấy được bản nháp AI'),
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [testId, studentId, enabled, version]);

  return state;
}
