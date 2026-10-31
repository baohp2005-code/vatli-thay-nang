export type ClassStatus = 'ACTIVE' | 'CLOSED';
export type ClassSessionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
export type ClassStudentStatus = 'STUDYING' | 'LEFT';
export type LeaveType = 'FULL_SESSION' | 'EARLY_LEAVE';
export type AttendanceSessionStatus = 'ACTIVE' | 'CLOSED';
export type AttendanceSource = 'STUDENT' | 'MANUAL';
export type ManualEditAction = 'MARK_ATTENDED' | 'REMOVE_ATTENDANCE' | 'ADD_NOTE';

export const CLASS_STUDENT_STATUS_LABEL: Record<ClassStudentStatus, string> = {
  STUDYING: 'Đang học',
  LEFT: 'Đã nghỉ',
};

export type ClassGroupColor =
  | 'BLUE'
  | 'ORANGE'
  | 'AQUA'
  | 'YELLOW'
  | 'MAGENTA'
  | 'GREEN'
  | 'VIOLET'
  | 'RED';

export interface ClassGroup {
  id: number;
  name: string;
  color: ClassGroupColor;
}

// Preset màu CVD-safe, text riêng đạt WCAG 4.5:1 — không cho nhập hex tự do.
export const CLASS_GROUP_COLOR_META: Record<
  ClassGroupColor,
  { label: string; bg: string; text: string; border: string }
> = {
  BLUE: { label: 'Xanh dương', bg: '#eaf2fb', text: '#2872cb', border: '#c3d9f4' },
  ORANGE: { label: 'Cam', bg: '#fdf0eb', text: '#be542a', border: '#f9d5c6' },
  AQUA: { label: 'Xanh ngọc', bg: '#e8f7f2', text: '#15855d', border: '#bfe9da' },
  YELLOW: { label: 'Vàng', bg: '#fdf6e6', text: '#9c6a00', border: '#fae5b8' },
  MAGENTA: { label: 'Hồng sen', bg: '#fdf2f6', text: '#ac5b79', border: '#f9dae6' },
  GREEN: { label: 'Xanh lá', bg: '#e6f3e6', text: '#007c00', border: '#b8dcb8' },
  VIOLET: { label: 'Tím', bg: '#edebf6', text: '#46379f', border: '#ccc8e6' },
  RED: { label: 'Đỏ', bg: '#fceded', text: '#d14342', border: '#f7cccc' },
};

export const CLASS_GROUP_COLOR_OPTIONS = (
  Object.entries(CLASS_GROUP_COLOR_META) as [
    ClassGroupColor,
    (typeof CLASS_GROUP_COLOR_META)[ClassGroupColor],
  ][]
).map(([value, meta]) => ({ value, ...meta }));

export interface ClassRow {
  id: number;
  name: string;
  code: string;
  description: string | null;
  status: ClassStatus;
  studentCount?: number;
  sessionCount?: number;
  createdAt?: string;
  /** Học phí thu theo tháng (VND, số nguyên). Chỉ trả cho ADMIN. */
  monthlyFee?: number;
  /** Gửi email kết quả điểm danh cho học sinh sau mỗi buổi. Chỉ trả cho ADMIN. */
  attendanceEmailEnabled?: boolean;
  // STUDENT only.
  attendedCount?: number;
  leaveCount?: number;
  notAttendedCount?: number;
  hasActiveAttendance?: boolean;
  /** Buổi học đang mở điểm danh (để nút "Điểm danh ngay" deep-link). */
  activeAttendanceSessionId?: number | null;
}

export interface ClassDetail extends ClassRow {
  createdAt: string;
}
