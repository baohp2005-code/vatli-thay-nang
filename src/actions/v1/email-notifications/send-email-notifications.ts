'use server';

import { AxiosError } from 'axios';
import { revalidatePath } from 'next/cache';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type { WeekChoice } from '@/types/actions/email-notifications';

export interface EmailActionResult {
  errors: string[];
  /** Số email mới đưa vào hàng đợi. */
  queued?: number;
}

async function post(
  path: string,
  body: unknown,
  fallbackError: string,
): Promise<EmailActionResult> {
  try {
    const res = await api.post(path, body);
    revalidatePath('/admin/email-notifications');
    return { errors: [], queued: (res.data as { data: { queued: number } }).data.queued };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { errors: extractErrors(error.response.data) };
    }
    return { errors: [fallbackError] };
  }
}

/** Gửi ngay lịch học tuần này / tuần sau (học sinh đã nhận lịch tuần đó thì bỏ qua). */
export async function sendWeeklyScheduleAction(week: WeekChoice): Promise<EmailActionResult> {
  return post(
    '/api/v1/email-notifications/weekly-schedule/send',
    { week },
    'Gửi email lịch học thất bại',
  );
}

/** Gửi ngay tổng kết tháng hiện tại — lượt riêng, không ảnh hưởng lượt cuối tháng. */
export async function sendMonthlyReportAction(): Promise<EmailActionResult> {
  return post(
    '/api/v1/email-notifications/monthly-report/send',
    {},
    'Gửi email tổng kết tháng thất bại',
  );
}

export async function retryEmailBatchAction(batchId: number): Promise<EmailActionResult> {
  return post(`/api/v1/email-notifications/batches/${batchId}/retry`, {}, 'Gửi lại email thất bại');
}
