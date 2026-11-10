'use server';

import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type { EmailSchedule } from '@/types/actions/email-notifications';

export interface GetEmailScheduleResponse {
  data: EmailSchedule | null;
  errors: string[];
}

export async function getEmailSchedule(): Promise<GetEmailScheduleResponse> {
  try {
    const res = await api.get('/api/v1/email-notifications/schedule');
    return { data: (res.data as { data: EmailSchedule }).data, errors: [] };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { data: null, errors: extractErrors(error.response.data) };
    }
    return { data: null, errors: ['Lấy lịch gửi email thất bại'] };
  }
}
