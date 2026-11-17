'use server';

import { AxiosError } from 'axios';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';

export interface SetSessionRecordingResult {
  errors: string[];
  /** Số email nhắc xem lại vừa xếp hàng (email điểm danh đã gửi trước khi gắn record). */
  reminded?: number;
  /** Record đã lưu nhưng xếp email nhắc bị lỗi — admin nên bấm "Gửi nhắc xem lại". */
  remindFailed?: boolean;
}

export async function setSessionRecordingAction(
  classSessionId: number,
  nodeId: number,
): Promise<SetSessionRecordingResult> {
  try {
    const res = await api.put(`/api/v1/class-sessions/${classSessionId}/recording`, { nodeId });
    revalidatePath('/admin/classes/[id]/class-sessions/[sessionId]', 'page');
    revalidatePath('/dashboard/classes/[id]/class-sessions/[sessionId]', 'page');
    const data = (res.data as { data: { reminded: number; remindFailed: boolean } }).data;
    return { errors: [], reminded: data.reminded, remindFailed: data.remindFailed };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { errors: extractErrors(error.response.data) };
    }
    return { errors: ['Gắn record cho buổi học thất bại'] };
  }
}
