'use server';

import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type {
  EmailNotificationType,
  IListEmailBatchesResult,
} from '@/types/actions/email-notifications';

export interface ListEmailBatchesResponse extends IListEmailBatchesResult {
  errors: string[];
}

export async function listEmailBatches(params: {
  page?: number;
  pageSize?: number;
  type?: EmailNotificationType;
}): Promise<ListEmailBatchesResponse> {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;
  try {
    const res = await api.get('/api/v1/email-notifications/batches', {
      params: { page, pageSize, ...(params.type ? { type: params.type } : {}) },
    });
    return { ...(res.data as IListEmailBatchesResult), errors: [] };
  } catch (error) {
    const errors =
      error instanceof AxiosError && error.response?.data
        ? extractErrors(error.response.data)
        : ['Lấy danh sách email tự động thất bại'];
    return { data: [], meta: { total: 0, page, pageSize }, errors };
  }
}
