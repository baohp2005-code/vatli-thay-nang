'use server';

import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type { AiDraftDetail, AiGradingListResult } from '@/types/ai-grading';

export interface ListAiGradingResponse {
  data: AiGradingListResult | null;
  errors: string[];
}

export interface GetAiDraftResponse {
  data: AiDraftDetail | null;
  errors: string[];
}

/**
 * Trạng thái AI của mọi bài nộp trong một bài kiểm tra. Nhẹ (BE không đọc cột JSON lớn) nên
 * gọi lặp vài giây một lần được — vẫn dưới trần throttler 120 req/phút.
 */
export async function listAiGrading(testId: number): Promise<ListAiGradingResponse> {
  try {
    const res = await api.get<AiGradingListResult>(`/api/v1/tests/${testId}/ai-grading`);
    return { data: res.data, errors: [] };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { data: null, errors: extractErrors(error.response.data) };
    }
    return { data: null, errors: ['Không lấy được trạng thái AI chấm bài'] };
  }
}

/** Bản nháp AI đầy đủ của một bài + gợi ý ôn tập đang được duyệt. */
export async function getAiDraft(testId: number, studentId: number): Promise<GetAiDraftResponse> {
  try {
    const res = await api.get<{ data: AiDraftDetail }>(
      `/api/v1/tests/${testId}/submissions/${studentId}/ai-grading`,
    );
    return { data: res.data.data, errors: [] };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { data: null, errors: extractErrors(error.response.data) };
    }
    return { data: null, errors: ['Không lấy được bản nháp AI'] };
  }
}
