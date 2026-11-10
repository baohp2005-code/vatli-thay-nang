'use server';

import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type { MonthlyRecipient, MonthlyReportPreview } from '@/types/actions/email-notifications';

/** Học sinh sẽ nhận tổng kết tháng (đang học ở lớp bật email tổng kết). */
export async function listMonthlyRecipients(): Promise<{
  data: MonthlyRecipient[];
  errors: string[];
}> {
  try {
    const res = await api.get('/api/v1/email-notifications/monthly-report/recipients');
    return { data: (res.data as { data: MonthlyRecipient[] }).data, errors: [] };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { data: [], errors: extractErrors(error.response.data) };
    }
    return { data: [], errors: ['Lấy danh sách học sinh thất bại'] };
  }
}

/** Xem trước email tổng kết tháng hiện tại của một học sinh (không gửi). */
export async function previewMonthlyReport(
  studentId: number,
): Promise<{ data: MonthlyReportPreview | null; errors: string[] }> {
  try {
    const res = await api.get('/api/v1/email-notifications/monthly-report/preview', {
      params: { studentId },
    });
    return { data: (res.data as { data: MonthlyReportPreview }).data, errors: [] };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { data: null, errors: extractErrors(error.response.data) };
    }
    return { data: null, errors: ['Xem trước email tổng kết thất bại'] };
  }
}
