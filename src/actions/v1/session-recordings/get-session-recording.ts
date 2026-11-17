'use server';

import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type { SessionRecordingStatus } from '@/types/actions/session-recordings';

export interface GetSessionRecordingResponse {
  data: SessionRecordingStatus | null;
  errors: string[];
}

export async function getSessionRecording(
  classSessionId: number,
): Promise<GetSessionRecordingResponse> {
  try {
    const res = await api.get(`/api/v1/class-sessions/${classSessionId}/recording`);
    return { data: (res.data as { data: SessionRecordingStatus }).data, errors: [] };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { data: null, errors: extractErrors(error.response.data) };
    }
    return { data: null, errors: ['Lấy thông tin record buổi học thất bại'] };
  }
}
