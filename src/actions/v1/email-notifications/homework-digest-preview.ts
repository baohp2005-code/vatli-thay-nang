'use server';

import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type {
  HomeworkDigestPreview,
  HomeworkDigestRecipient,
} from '@/types/actions/email-notifications';

/** Học sinh sẽ nhận email "Bài tập còn nợ" nếu gửi lúc này + số bài mỗi em đang nợ. */
export async function listHomeworkDigestRecipients(): Promise<{
  data: HomeworkDigestRecipient[];
  errors: string[];
}> {
  try {
    const res = await api.get('/api/v1/email-notifications/homework-digest/recipients');
    return { data: (res.data as { data: HomeworkDigestRecipient[] }).data, errors: [] };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { data: [], errors: extractErrors(error.response.data) };
    }
    return { data: [], errors: ['Lấy danh sách học sinh thất bại'] };
  }
}

/** Xem trước email "Bài tập còn nợ" của một học sinh, tính tới lúc này (không gửi). */
export async function previewHomeworkDigest(
  studentId: number,
): Promise<{ data: HomeworkDigestPreview | null; errors: string[] }> {
  try {
    const res = await api.get('/api/v1/email-notifications/homework-digest/preview', {
      params: { studentId },
    });
    return { data: (res.data as { data: HomeworkDigestPreview }).data, errors: [] };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { data: null, errors: extractErrors(error.response.data) };
    }
    return { data: null, errors: ['Xem trước email bài tập còn nợ thất bại'] };
  }
}
