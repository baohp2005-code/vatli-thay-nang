'use server';

import { AxiosError } from 'axios';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type { AttendanceEmailSendMode } from '@/types/actions/attendance';

export interface SendAttendanceEmailsResult {
  errors: string[];
  /** Số email đã đưa vào hàng đợi gửi. */
  queued?: number;
}

export async function sendAttendanceEmailsAction(
  classSessionId: number,
  mode: AttendanceEmailSendMode,
): Promise<SendAttendanceEmailsResult> {
  try {
    const res = await api.post(
      `/api/v1/class-sessions/${classSessionId}/attendance-notifications/send`,
      { mode },
    );
    revalidatePath('/admin/classes/[id]/class-sessions/[sessionId]', 'page');
    return { errors: [], queued: (res.data as { data: { queued: number } }).data.queued };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { errors: extractErrors(error.response.data) };
    }
    return { errors: ['Gửi email điểm danh thất bại'] };
  }
}
