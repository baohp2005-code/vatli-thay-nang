'use server';

import { AxiosError } from 'axios';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type { IUpsertSubmissionPayload } from '@/types/actions/tests';
import type { IActionState } from '@/types/actions/users';

/**
 * Nộp / cập nhật bài làm (ghi đè bài cũ).
 *
 * BE chốt cutoff cứng theo giờ máy chủ: ngoài [startTime, endTime] là 403, dù FE có
 * ẩn nút hay không — trừ bài tập (HOMEWORK): quá hạn vẫn nhận, ghi nhận nộp muộn (bài đã
 * nộp đúng hạn thì không ghi đè được sau hạn). Nộp lại khi bài đã được chấm sẽ HUỶ điểm cũ (về trạng thái chờ
 * chấm) — điểm cũ chấm cho bài cũ.
 *
 * files KHÔNG chứa fileUrl: BE tự dựng từ fileStorageKey.
 */
export async function upsertSubmissionAction(
  courseId: number,
  testId: number,
  payload: IUpsertSubmissionPayload,
): Promise<IActionState> {
  try {
    await api.put(`/api/v1/tests/${testId}/submission`, payload);
    revalidatePath(`/dashboard/courses/${courseId}/learn`);
    return { errors: [] };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { errors: extractErrors(error.response.data) };
    }
    return { errors: ['Nộp bài thất bại'] };
  }
}
