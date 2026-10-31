'use server';

import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type { AttendanceEmailStatus } from '@/types/actions/attendance';

export interface GetAttendanceEmailStatusResponse {
  data: AttendanceEmailStatus | null;
  errors: string[];
}

export async function getAttendanceEmailStatus(
  classSessionId: number,
): Promise<GetAttendanceEmailStatusResponse> {
  try {
    const res = await api.get(`/api/v1/class-sessions/${classSessionId}/attendance-notifications`);
    const result = res.data as { data: AttendanceEmailStatus };
    return { data: result.data, errors: [] };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { data: null, errors: extractErrors(error.response.data) };
    }
    return { data: null, errors: ['Lấy trạng thái email điểm danh thất bại'] };
  }
}
