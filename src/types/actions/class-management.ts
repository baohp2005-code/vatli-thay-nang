import type { ClassStudentSortBy } from '@/types/actions/attendance';
import type { ListMeta, SortOrder } from '@/types/auth';
import type {
  ClassGroup,
  ClassGroupColor,
  ClassRow,
  ClassStatus,
  ClassStudentStatus,
} from '@/types/class-management';

export interface IListClassesParams {
  /** Tìm gộp (OR): tên lớp, mã lớp. */
  q?: string;
  name?: string;
  code?: string;
  status?: ClassStatus;
  createdFrom?: string;
  createdTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ClassesListStats {
  total: number;
  active: number;
  closed: number;
  totalStudents: number;
}

export interface IListClassesResult {
  data: ClassRow[];
  meta: ListMeta;
  stats: ClassesListStats;
}

export interface ICreateClassPayload {
  name: string;
  code: string;
  description?: string;
  monthlyFee?: number;
  attendanceEmailEnabled?: boolean;
}

export interface IUpdateClassPayload {
  name?: string;
  code?: string;
  description?: string;
  status?: ClassStatus;
  monthlyFee?: number;
  attendanceEmailEnabled?: boolean;
}

export interface ClassStudentListRow {
  /** id của bản ghi ClassStudent — KHÔNG phải userId. Các API vòng đời dùng studentId. */
  id: number;
  studentId: number;
  email: string;
  fullName: string | null;
  /** null → hiển thị theo `createdAt` (PHASE-1 §III.1). */
  enrollmentDate: string | null;
  leftAt: string | null;
  status: ClassStudentStatus;
  classGroup: ClassGroup | null;
  createdAt: string;
}

export interface ClassStudentListStats {
  total: number;
  studying: number;
  left: number;
}

export interface IListClassStudentsParams {
  /** Tìm gộp (OR): email, họ tên học sinh. */
  q?: string;
  email?: string;
  fullName?: string;
  status?: ClassStudentStatus;
  /** Lọc theo 1 nhóm cụ thể. Loại trừ lẫn nhau với unassignedGroup. */
  classGroupId?: number;
  /** true = chỉ lấy học sinh chưa phân nhóm. */
  unassignedGroup?: boolean;
  /** Bỏ trống = giữ thứ tự thêm vào lớp (mới nhất trước). */
  sortBy?: ClassStudentSortBy;
  sortOrder?: SortOrder;
  page?: number;
  pageSize?: number;
}

export interface ClassGroupRow extends ClassGroup {
  studentCount: number;
}

export interface IListClassGroupsResult {
  data: ClassGroupRow[];
}

export interface ICreateClassGroupPayload {
  name: string;
  color: ClassGroupColor;
}

export interface IUpdateClassGroupPayload {
  name?: string;
  color?: ClassGroupColor;
}

export interface IAssignClassGroupPayload {
  studentIds: number[];
  classGroupId: number | null;
}

export interface IListClassStudentsResult {
  data: ClassStudentListRow[];
  meta: ListMeta;
  stats: ClassStudentListStats;
}

export interface IUpdateEnrollmentDatePayload {
  /** YYYY-MM-DD, BE quy chiếu theo Asia/Ho_Chi_Minh. null = xoá, quay về createdAt. */
  enrollmentDate: string | null;
}

export interface ILeaveClassStudentPayload {
  leftAt: string;
}

export interface ClassSessionListRow {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  meetingUrl: string | null;
  // ADMIN only (list() admin branch, listAll()).
  attendedCount?: number;
  totalStudents?: number;
  activeAttendanceSession?: { id: number; closedAt: string } | null;
  // STUDENT only (list() student branch).
  myStatus?: 'ATTENDED' | 'ON_LEAVE' | 'NOT_ATTENDED';
  hasActiveAttendance?: boolean;
}

export interface ClassSessionListRowWithClass extends ClassSessionListRow {
  classId: number;
  classCode: string;
  className: string;
}

export interface IListAllClassSessionsParams {
  /** Tìm gộp: tiêu đề buổi học. */
  q?: string;
  classCode?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface IListAllClassSessionsResult {
  data: ClassSessionListRowWithClass[];
  meta: ListMeta;
}

export interface IListClassSessionsParams {
  page?: number;
  pageSize?: number;
}

export interface IListClassSessionsResult {
  data: ClassSessionListRow[];
  meta: ListMeta;
}

export interface ClassSessionDetail {
  id: number;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string;
  meetingUrl: string | null;
  activeAttendanceSession: { id: number; closedAt: string } | null;
}

export interface ICreateClassSessionPayload {
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  meetingUrl?: string;
}

export interface IUpdateClassSessionPayload {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  meetingUrl?: string;
}
