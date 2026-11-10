'use server';

import { AxiosError } from 'axios';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type { IGradeSubmissionPayload, IGradeSubmissionResult } from '@/types/actions/tests';

/**
 * Chấm điểm + nhận xét. BE từ chối nếu score > maxScore hoặc học sinh chưa nộp bài.
 * Bài kiểm tra bật email: BE hẹn email báo điểm sau lần lưu cuối vài phút — `scoreEmailAt`.
 */
export async function gradeSubmissionAction(
  courseId: number,
  testId: number,
  studentId: number,
  payload: IGradeSubmissionPayload,
): Promise<IGradeSubmissionResult> {
  try {
    const res = await api.patch<{ data?: { scoreEmailAt?: string | null } }>(
      `/api/v1/tests/${testId}/submissions/${studentId}/grade`,
      payload,
    );
    revalidatePath(`/admin/courses/${courseId}/tests/${testId}`);
    return { errors: [], scoreEmailAt: res.data?.data?.scoreEmailAt ?? null };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { errors: extractErrors(error.response.data) };
    }
    return { errors: ['Chấm điểm thất bại'] };
  }
}
