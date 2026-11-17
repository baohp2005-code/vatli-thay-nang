'use server';

import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type { OutstandingHomework } from '@/types/tests';

/**
 * Bài tập học sinh còn nợ ở mọi khóa đang học (dashboard) — quá hạn lâu nhất trước, rồi
 * tới bài hạn gần nhất. Cùng logic chọn bài với email tổng hợp 20h Chủ nhật.
 */
export async function listOutstandingHomework(): Promise<{
  data: OutstandingHomework[];
  /** Mốc lấy dữ liệu (ms) — để hiện "trễ N ngày / còn N giờ" mà không gọi Date.now() lúc render. */
  fetchedAt: number;
  errors: string[];
}> {
  const fetchedAt = Date.now();
  try {
    const res = await api.get('/api/v1/homework/outstanding');
    return { data: (res.data as { data: OutstandingHomework[] }).data, fetchedAt, errors: [] };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { data: [], fetchedAt, errors: extractErrors(error.response.data) };
    }
    return { data: [], fetchedAt, errors: ['Lấy danh sách bài tập còn nợ thất bại'] };
  }
}
