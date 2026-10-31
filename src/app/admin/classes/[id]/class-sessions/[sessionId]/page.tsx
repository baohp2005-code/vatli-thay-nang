import { notFound } from 'next/navigation';
import { getClassSession } from '@/actions/v1/class-sessions/get-class-session';
import { listAttendanceSessions } from '@/actions/v1/attendance/list-attendance-sessions';
import { getAttendanceSummary } from '@/actions/v1/attendance/get-attendance-summary';
import { listLeaveRequests } from '@/actions/v1/leave-requests/list-leave-requests';
import { getAttendanceEmailStatus } from '@/actions/v1/attendance-notifications/get-attendance-email-status';
import { getCurrentSession } from '@/lib/server/session';
import ClassSessionDetailPageClient from './ClassSessionDetailPageClient';

interface Props {
  params: Promise<{ id: string; sessionId: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function ClassSessionDetailPage({ params, searchParams }: Props) {
  const { id, sessionId } = await params;
  const sp = await searchParams;
  const classId = Number(id);
  const classSessionId = Number(sessionId);
  if (!Number.isInteger(classId) || classId <= 0) notFound();
  if (!Number.isInteger(classSessionId) || classSessionId <= 0) notFound();

  const fromSessionsList = sp.from === 'sessions-list';
  const backHref = fromSessionsList
    ? '/admin/classes/class-sessions'
    : `/admin/classes/${classId}?tab=sessions`;
  const backLabel = fromSessionsList ? 'Quay lại danh sách buổi học' : 'Quay lại lớp học';

  const attendanceSessionsPromise = listAttendanceSessions(classSessionId, {
    page: 1,
    pageSize: 50,
  });
  const summaryPromise = getAttendanceSummary(classSessionId);
  const leaveRequestsPromise = listLeaveRequests(classSessionId, { page: 1, pageSize: 20 });
  // getCurrentSession đã được layout gọi (React.cache) — không tốn thêm request.
  const session = await getCurrentSession();
  const emailStatusPromise =
    session?.role === 'ADMIN' ? getAttendanceEmailStatus(classSessionId) : null;

  const classSession = await getClassSession(classSessionId);
  if (!classSession) notFound();

  return (
    <ClassSessionDetailPageClient
      classSession={classSession}
      backHref={backHref}
      backLabel={backLabel}
      attendanceSessionsPromise={attendanceSessionsPromise}
      summaryPromise={summaryPromise}
      leaveRequestsPromise={leaveRequestsPromise}
      emailStatusPromise={emailStatusPromise}
    />
  );
}
