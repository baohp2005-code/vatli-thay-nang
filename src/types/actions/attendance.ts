import type { ListMeta } from '@/types/auth';
import type {
  AttendanceSessionStatus,
  AttendanceSource,
  LeaveType,
  ManualEditAction,
} from '@/types/class-management';

export interface AttendanceSessionListRow {
  id: number;
  openedAt: string;
  closedAt: string;
  durationMinutes: number;
  status: AttendanceSessionStatus;
}

export interface IListAttendanceSessionsParams {
  page?: number;
  pageSize?: number;
}

export interface IListAttendanceSessionsResult {
  data: AttendanceSessionListRow[];
  meta: ListMeta;
}

export interface IOpenAttendancePayload {
  durationMinutes: number;
}

export interface AttendanceSummaryStudentLog {
  attendanceSessionId: number;
  checkedAt: string;
  source: AttendanceSource;
  note: string | null;
}

export interface AttendanceSummaryLeaveRequest {
  reason: string;
  leaveType: LeaveType;
  submittedAt: string;
}

export interface AttendanceSummaryStudent {
  studentId: number;
  fullName: string | null;
  email: string;
  leaveRequest: AttendanceSummaryLeaveRequest | null;
  attendances: AttendanceSummaryStudentLog[];
}

export interface AttendanceSummary {
  counts: {
    total: number;
    attended: number;
    notAttended: number;
    onLeave: number;
  };
  attendanceSessions: AttendanceSessionListRow[];
  students: AttendanceSummaryStudent[];
}

export interface IManualAttendancePayload {
  studentId: number;
  action: ManualEditAction;
  attendanceSessionId?: number;
  note?: string;
}

export interface AttendanceLogListRow {
  id: number;
  attendanceSessionId: number;
  checkedAt: string;
  source: AttendanceSource;
  note: string | null;
  student: {
    id: number;
    fullName: string | null;
    email: string;
  };
}

export interface MyAttendanceLog {
  attendanceSessionId: number;
  checkedAt: string;
}

export interface ClassAttendanceCounts {
  totalSessions: number;
  present: number;
  leaveFull: number;
  leaveEarly: number;
  totalLeave: number;
  absentNoCheckin: number;
}

export interface ClassAttendanceStudentRow extends ClassAttendanceCounts {
  studentId: number;
}

export const ATTENDANCE_COUNT_LABEL: Record<keyof ClassAttendanceCounts, string> = {
  totalSessions: 'Tổng số buổi',
  present: 'Đã điểm danh',
  leaveFull: 'Nghỉ cả buổi',
  leaveEarly: 'Nghỉ giữa chừng',
  totalLeave: 'Tổng nghỉ',
  absentNoCheckin: 'Vắng không điểm danh',
};

/** Kết quả điểm danh báo qua email — khớp enum AttendanceNotifyStatus phía BE. */
export type AttendanceNotifyStatus = 'ATTENDED' | 'ON_LEAVE' | 'ABSENT';

export type NotificationDeliveryStatus = 'PENDING' | 'SENT' | 'FAILED';

/** ALL: gửi lần đầu. FAILED: gửi lại email lỗi. CHANGED: gửi lại cho HS có kết quả đổi. */
export type AttendanceEmailSendMode = 'ALL' | 'FAILED' | 'CHANGED';

export const ATTENDANCE_NOTIFY_STATUS_LABEL: Record<AttendanceNotifyStatus, string> = {
  ATTENDED: 'Có mặt',
  ON_LEAVE: 'Vắng có phép',
  ABSENT: 'Vắng không phép',
};

export interface AttendanceEmailStudent {
  studentId: number;
  fullName: string | null;
  email: string;
  /** null khi buổi chưa kết thúc, hoặc HS không còn trong danh sách (vd bị khoá). */
  currentStatus: AttendanceNotifyStatus | null;
  /** Kết quả đã báo qua email — null = chưa gửi cho em này. */
  sentStatus: AttendanceNotifyStatus | null;
  deliveryStatus: NotificationDeliveryStatus | null;
  sentAt: string | null;
  error: string | null;
  /** Kết quả đã đổi sau khi gửi (sửa điểm danh tay) hoặc HS mới có trong danh sách. */
  changed: boolean;
}

export interface AttendanceEmailStatus {
  /** Lớp có bật gửi email kết quả điểm danh không. */
  enabled: boolean;
  /** Đã hết giờ học và không còn phiên điểm danh nào đang mở. */
  ended: boolean;
  hasAttendanceSession: boolean;
  notifiedAt: string | null;
  /** Mốc hệ thống sẽ tự gửi — null khi đã gửi / lớp chưa bật / chưa mở điểm danh. */
  scheduledFor: string | null;
  counts: { sent: number; failed: number; pending: number; changed: number };
  students: AttendanceEmailStudent[];
}

/** Chỉ số sắp xếp được ở bảng học sinh — khớp enum ClassStudentSortBy phía BE. */
export const ATTENDANCE_SORT_KEYS = [
  'present',
  'totalLeave',
  'leaveEarly',
  'absentNoCheckin',
] as const;

export type ClassStudentSortBy = (typeof ATTENDANCE_SORT_KEYS)[number];
