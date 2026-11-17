import type {
  AttendanceNotifyStatus,
  NotificationDeliveryStatus,
} from '@/types/actions/attendance';
import type { LeaveType } from '@/types/class-management';
import type { BunnyVideoStatus, CourseStatus } from '@/types/course-management';

/** Record của buổi trong GET /class-sessions/:id (học sinh / admin). */
export interface ClassSessionRecording {
  nodeId: number;
  title: string;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  courseId: number;
  courseTitle: string;
  /** Học sinh: video xem được + khóa đã xuất bản + đang ghi danh khóa. Admin: video xem được. */
  canOpen: boolean;
}

/** Học sinh đã được báo link record qua email điểm danh hay email nhắc riêng. */
export type RecordingNoticeChannel = 'ATTENDANCE_MAIL' | 'REMINDER';

export interface RecordingNotice {
  channel: RecordingNoticeChannel;
  deliveryStatus: NotificationDeliveryStatus;
  sentAt: string | null;
  error: string | null;
}

export type UserAccountStatus = 'UNACTIVATED' | 'ACTIVATED' | 'DISABLED';

export interface RecordingStudentRow {
  studentId: number;
  fullName: string | null;
  email: string;
  /** Kết quả điểm danh HIỆN TẠI (luôn khác ATTENDED — chỉ liệt kê học sinh vắng). */
  attendanceStatus: AttendanceNotifyStatus;
  leaveType: LeaveType | null;
  userStatus: UserAccountStatus | null;
  /** Mọi khóa học sinh đang ghi danh ACTIVE — FE cảnh báo ngay khi chọn khóa. */
  activeCourseIds: number[];
  /** Đang ghi danh khóa của record hiện tại. */
  enrolled: boolean;
  /** Thuộc diện nhận link: tài khoản đã kích hoạt + ghi danh khóa của record. */
  eligible: boolean;
  notice: RecordingNotice | null;
  /** Bấm "Gửi nhắc xem lại" sẽ gửi (mới hoặc gửi lại email lỗi) cho em này. */
  needsReminder: boolean;
  watch: {
    coveragePercent: number;
    completedViews: number;
    lastViewedAt: string;
  } | null;
}

export interface SessionRecordingStatus {
  /** Lớp bật email điểm danh — mọi email về record đi theo công tắc này. */
  enabled: boolean;
  attendanceNotifiedAt: string | null;
  recording: {
    nodeId: number;
    title: string;
    durationSeconds: number | null;
    thumbnailUrl: string | null;
    bunnyStatus: BunnyVideoStatus | null;
    courseId: number;
    courseTitle: string;
    courseStatus: CourseStatus;
    attachedAt: string | null;
    /** Video còn xem được và khóa đang xuất bản. */
    openable: boolean;
  } | null;
  counts: {
    missed: number;
    enrolled: number;
    eligible: number;
    sent: number;
    pending: number;
    failed: number;
    needsReminder: number;
    watched: number;
    completed: number;
  };
  students: RecordingStudentRow[];
}
