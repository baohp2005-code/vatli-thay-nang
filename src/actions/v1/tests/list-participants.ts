'use server';

import { AxiosError } from 'axios';
import { api } from '@/lib/axios';
import { extractErrors } from '@/lib/errors';
import { fetchAllPages } from '@/lib/paginate';
import type { ParticipantRow, ParticipantsResult } from '@/types/tests';

export interface ListParticipantsResponse extends ParticipantsResult {
  errors: string[];
}

const EMPTY: ParticipantsResult = {
  data: [],
  meta: { total: 0, page: 1, pageSize: 0 },
  myScore: null,
  distribution: null,
  gradedCount: null,
  pendingCount: null,
  minGradedForDistribution: 5,
  myRank: null,
};

/**
 * Danh sách bạn học cho tab thống kê của HỌC SINH — gom hết các trang, xem `fetchAllPages`.
 *
 * BE chỉ trả tên + đã/chưa nộp — không bao giờ có điểm của bạn học. `myScore` và
 * `distribution` chỉ có khi bài đã kết thúc; `distribution` còn cần đủ
 * `minGradedForDistribution` bài đã chấm (lớp quá ít người thì biểu đồ "ẩn danh"
 * vẫn lộ điểm của nhau).
 */
export async function listParticipants(testId: number): Promise<ListParticipantsResponse> {
  // Mấy field ngoài `data` giống nhau ở mọi trang — lấy ở trang đầu.
  let summary: ParticipantsResult = EMPTY;

  try {
    const { data, meta } = await fetchAllPages<ParticipantRow>(async (page, pageSize) => {
      const res = await api.get(`/api/v1/tests/${testId}/participants`, {
        params: { page, pageSize },
      });
      const result = res.data as ParticipantsResult;
      if (page === 1) summary = result;
      return result;
    });
    return { ...summary, data, meta, errors: [] };
  } catch (error) {
    if (error instanceof AxiosError && error.response?.data) {
      return { ...EMPTY, errors: extractErrors(error.response.data) };
    }
    return { ...EMPTY, errors: ['Lấy danh sách bạn học thất bại'] };
  }
}
