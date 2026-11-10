'use server';

import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type { EmailBatchDetail, EmailContent } from '@/types/actions/email-notifications';

export async function getEmailBatch(
  batchId: number,
): Promise<{ data: EmailBatchDetail | null; errors: string[] }> {
  try {
    const res = await api.get(`/api/v1/email-notifications/batches/${batchId}`);
    return { data: (res.data as { data: EmailBatchDetail }).data, errors: [] };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { data: null, errors: extractErrors(error.response.data) };
    }
    return { data: null, errors: ['Lấy chi tiết lượt gửi thất bại'] };
  }
}

/** Nội dung một email đúng như gửi đi. */
export async function getEmailContent(
  notificationId: number,
): Promise<{ data: EmailContent | null; errors: string[] }> {
  try {
    const res = await api.get(`/api/v1/email-notifications/notifications/${notificationId}`);
    return { data: (res.data as { data: EmailContent }).data, errors: [] };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { data: null, errors: extractErrors(error.response.data) };
    }
    return { data: null, errors: ['Lấy nội dung email thất bại'] };
  }
}
