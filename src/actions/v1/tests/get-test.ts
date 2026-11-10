'use server';

import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import type { StudentTestDetail, TestDetail } from '@/types/tests';

export interface GetTestResponse<T> {
  data: T | null;
  errors: string[];
  /** HTTP status của BE — trang cần phân biệt 404 (không tồn tại) với 403 (không có quyền). */
  status?: number;
  /** Giờ server (Next) lúc trả — đồng hồ máy học sinh có thể lệch hàng giờ. */
  serverTime?: string;
}

/**
 * Chi tiết bài kiểm tra. BE giấu description + attachments của học sinh khi phase =
 * SCHEDULED, và chỉ trả myScore khi ENDED + đã chấm.
 *
 * Trả về errors thay vì nuốt hết thành null: 403 (chưa ghi danh / tài khoản bị khoá)
 * và 404 là hai chuyện khác nhau — hiện "không tìm thấy" cho một em bị chặn quyền là
 * đánh lừa người dùng.
 */
export async function getTest<T extends TestDetail | StudentTestDetail = TestDetail>(
  testId: number,
): Promise<GetTestResponse<T>> {
  try {
    const res = await api.get(`/api/v1/tests/${testId}`);
    return {
      data: (res.data as { data: T }).data,
      errors: [],
      serverTime: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return {
        data: null,
        errors: extractErrors(error.response.data),
        status: error.response.status,
      };
    }
    return { data: null, errors: ['Không lấy được bài kiểm tra'] };
  }
}
