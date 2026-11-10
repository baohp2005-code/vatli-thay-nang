import type {
  AdminTestRow,
  PageMeta,
  StudentTestRow,
  SubmissionFilterStatus,
  SubmissionRow,
  TestFilePayload,
  TestStats,
  TestType,
} from '@/types/tests';

export interface IListTestsResult<T = AdminTestRow | StudentTestRow> {
  data: T[];
  meta: PageMeta;
}

export interface ICreateTestPayload {
  title: string;
  description?: string;
  /** Mặc định EXAM. HOMEWORK: không chấm điểm, không đồng hồ — bỏ maxScore/durationMinutes. */
  type?: TestType;
  /**
   * Gửi email cho học sinh. Bài tập: báo bài mới + nhắc hạn nộp trước 24h cho em chưa nộp.
   * Bài kiểm tra: báo điểm vài phút sau lần chấm / sửa điểm cuối.
   */
  emailNotify?: boolean;
  /** ISO 8601. BE chặn nếu endTime <= startTime. */
  startTime: string;
  endTime: string;
  /** 0.01 … 999.99 (Decimal(5,2) ở BE). Bắt buộc với bài kiểm tra. */
  maxScore?: number;
  /** Thời gian làm bài (phút), 1 … 1440. Bắt buộc với bài kiểm tra. */
  durationMinutes?: number;
  attachments?: TestFilePayload[];
}

/** attachments là danh sách ĐẦY ĐỦ mới — BE diff để xoá file bị bỏ khỏi R2. */
export type IUpdateTestPayload = Partial<ICreateTestPayload>;

export interface IUpsertSubmissionPayload {
  note?: string;
  /** Tối đa 30 file, ít nhất 1. */
  files: TestFilePayload[];
}

export interface IGradeSubmissionPayload {
  score: number;
  feedback?: string;
}

export interface IGradeSubmissionResult {
  errors: string[];
  /** ISO — lúc email báo điểm sẽ được gửi; null = bài này không gửi email. */
  scoreEmailAt?: string | null;
}

export interface IListSubmissionsParams {
  page?: number;
  pageSize?: number;
  status?: SubmissionFilterStatus;
}

export interface IListSubmissionsResult {
  data: SubmissionRow[];
  meta: PageMeta;
  stats: TestStats;
}
