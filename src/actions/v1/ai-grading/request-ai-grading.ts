'use server';

import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type { AiBulkResult } from '@/types/ai-grading';

export interface RequestAiGradingOneResponse {
  errors: string[];
  /** 1 = đã xếp hàng; 0 = bài này đang chạy sẵn (không chạy trùng). */
  queued: number;
}

export interface RequestAiGradingBulkResponse {
  errors: string[];
  result: AiBulkResult | null;
}

/**
 * "Chấm bằng AI" cho một bài. Chỉ xếp hàng — kết quả tới sau vài chục giây, FE theo dõi bằng
 * listAiGrading. Không revalidatePath: bản nháp AI không nằm trong trang render ở server.
 */
export async function requestAiGradingAction(
  testId: number,
  studentId: number,
): Promise<RequestAiGradingOneResponse> {
  try {
    const res = await api.post<{ data?: { queued?: number } }>(
      `/api/v1/tests/${testId}/submissions/${studentId}/ai-grading`,
    );
    return { errors: [], queued: res.data?.data?.queued ?? 0 };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { errors: extractErrors(error.response.data), queued: 0 };
    }
    return { errors: ['Không gửi được yêu cầu AI chấm bài'], queued: 0 };
  }
}

/**
 * "Chấm cả lớp bằng AI". Mặc định chỉ bài đã nộp chưa chấm và chưa có bản nháp còn mới;
 * `includeGraded` thêm bài đã chấm, `redo` chấm lại cả bài đã có bản nháp mới (tốn thêm tiền).
 */
export async function requestAiGradingBulkAction(
  testId: number,
  options: { includeGraded?: boolean; redo?: boolean } = {},
): Promise<RequestAiGradingBulkResponse> {
  try {
    const res = await api.post<{ data?: AiBulkResult }>(`/api/v1/tests/${testId}/ai-grading`, {
      includeGraded: options.includeGraded === true,
      redo: options.redo === true,
    });
    return { errors: [], result: res.data?.data ?? null };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { errors: extractErrors(error.response.data), result: null };
    }
    return { errors: ['Không gửi được yêu cầu AI chấm bài'], result: null };
  }
}
