import type { ListMeta } from '@/types/auth';
import type { NotificationDeliveryStatus } from '@/types/actions/attendance';

/** Khớp enum EmailNotificationType phía BE. */
export type EmailNotificationType =
  | 'WEEKLY_SCHEDULE'
  | 'HOMEWORK_ASSIGNED'
  | 'HOMEWORK_REMINDER'
  | 'MONTHLY_REPORT'
  | 'TEST_SCORE';

export const EMAIL_NOTIFICATION_TYPE_LABEL: Record<EmailNotificationType, string> = {
  WEEKLY_SCHEDULE: 'Lịch học tuần',
  HOMEWORK_ASSIGNED: 'Bài tập mới',
  HOMEWORK_REMINDER: 'Nhắc hạn nộp',
  MONTHLY_REPORT: 'Tổng kết tháng',
  TEST_SCORE: 'Báo điểm',
};

export interface EmailDeliveryCounts {
  sent: number;
  failed: number;
  pending: number;
}

/** Một lượt gửi email tự động (vd lịch tuần của 1 lớp, 1 bài tập mới…). */
export interface EmailBatchRow {
  id: number;
  type: EmailNotificationType;
  key: string;
  label: string;
  createdAt: string;
  counts: EmailDeliveryCounts;
}

export interface IListEmailBatchesResult {
  data: EmailBatchRow[];
  meta: ListMeta;
}

export interface EmailBatchNotification {
  id: number;
  studentId: number;
  fullName: string | null;
  email: string;
  subject: string;
  deliveryStatus: NotificationDeliveryStatus;
  sentAt: string | null;
  error: string | null;
}

export interface EmailBatchDetail extends EmailBatchRow {
  notifications: EmailBatchNotification[];
}

/** Nội dung một email đúng như gửi đi (HTML) — để admin xem lại. */
export interface EmailContent {
  email: string;
  subject: string;
  html: string;
}

/** null = lịch chưa đăng ký được ở BE (Redis lỗi lúc khởi động). */
export interface EmailSchedule {
  weekly: string | null;
  monthly: string | null;
}

/** CURRENT: các buổi còn lại của tuần này. NEXT: cả tuần sau. */
export type WeekChoice = 'CURRENT' | 'NEXT';

export interface EmailSendResult {
  queued: number;
}

export interface MonthlyRecipient {
  id: number;
  email: string;
  fullName: string | null;
}

export interface MonthlyReportPreview {
  email: string;
  subject: string;
  html: string;
  /** Tháng này em chưa có dữ liệu gì — lượt gửi thật sẽ bỏ qua em này. */
  empty: boolean;
}
