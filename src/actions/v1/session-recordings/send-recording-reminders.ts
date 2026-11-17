'use server';

import { AxiosError } from 'axios';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';

export interface SendRecordingRemindersResult {
  errors: string[];
  /** Số email nhắc đưa vào hàng đợi (mới + gửi lại email lỗi). */
  queued?: number;
}

export async function sendRecordingRemindersAction(
  classSessionId: number,
): Promise<SendRecordingRemindersResult> {
  try {
    const res = await api.post(`/api/v1/class-sessions/${classSessionId}/recording/remind`);
    revalidatePath('/admin/classes/[id]/class-sessions/[sessionId]', 'page');
    return { errors: [], queued: (res.data as { data: { queued: number } }).data.queued };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { errors: extractErrors(error.response.data) };
    }
    return { errors: ['Gửi email nhắc xem lại thất bại'] };
  }
}
