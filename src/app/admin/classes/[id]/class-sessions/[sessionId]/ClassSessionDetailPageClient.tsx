'use client';

import { Suspense, use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useResolved } from '@/lib/actions';
import ClassSessionInfoSection from '@/components/features/class-sessions/ClassSessionInfoSection';
import AttendanceSection from '@/components/features/class-sessions/AttendanceSection';
import AttendanceOverview from '@/components/features/class-sessions/AttendanceOverview';
import AttendanceEmailCard from '@/components/features/class-sessions/AttendanceEmailCard';
import LeaveRequestsSection from '@/components/features/leave-requests/LeaveRequestsSection';
import { CLASS_SESSION_STATUS_MAP, getEffectiveStatus } from '@/lib/class-sessions';
import type { ListAttendanceSessionsResponse } from '@/actions/v1/attendance/list-attendance-sessions';
import type { GetAttendanceSummaryResponse } from '@/actions/v1/attendance/get-attendance-summary';
import type { GetAttendanceEmailStatusResponse } from '@/actions/v1/attendance-notifications/get-attendance-email-status';
import type { ClassSessionDetail } from '@/types/actions/class-management';
import type { IListLeaveRequestsResult } from '@/types/actions/leave-requests';

interface Props {
  classSession: ClassSessionDetail;
  backHref: string;
  backLabel: string;
  attendanceSessionsPromise: Promise<ListAttendanceSessionsResponse>;
  summaryPromise: Promise<GetAttendanceSummaryResponse>;
  leaveRequestsPromise: Promise<IListLeaveRequestsResult>;
  /** null với Trợ giảng — email điểm danh là việc của ADMIN (BE chặn 403). */
  emailStatusPromise: Promise<GetAttendanceEmailStatusResponse> | null;
}

function AttendanceEmailSection({
  classSessionId,
  promise,
}: {
  classSessionId: number;
  promise: Promise<GetAttendanceEmailStatusResponse>;
}) {
  const { data } = useResolved(promise);
  return <AttendanceEmailCard classSessionId={classSessionId} status={data} />;
}

function AttendanceSectionsGroup({
  classSession,
  attendanceSessionsPromise,
  summaryPromise,
}: {
  classSession: ClassSessionDetail;
  attendanceSessionsPromise: Promise<ListAttendanceSessionsResponse>;
  summaryPromise: Promise<GetAttendanceSummaryResponse>;
}) {
  const { data: attendanceSessions } = useResolved(attendanceSessionsPromise);
  const { data: summary } = useResolved(summaryPromise);

  return (
    <>
      <AttendanceOverview classSessionId={classSession.id} counts={summary?.counts ?? null} />

      <AttendanceSection
        classSessionId={classSession.id}
        startTime={classSession.startTime}
        endTime={classSession.endTime}
        activeAttendanceSession={classSession.activeAttendanceSession}
        attendanceSessions={attendanceSessions}
        summary={summary}
      />
    </>
  );
}

function LeaveRequestsSectionWrapper({ promise }: { promise: Promise<IListLeaveRequestsResult> }) {
  const { data, meta } = use(promise);
  return <LeaveRequestsSection data={data} meta={meta} />;
}

export function AttendanceSectionsSkeleton() {
  return (
    <>
      <Card>
        <CardContent className="flex flex-wrap gap-6 py-4 sm:py-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-10" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 py-4 sm:py-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </>
  );
}

export function LeaveRequestsSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 py-4 sm:py-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  );
}

function AttendanceEmailSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 py-4 sm:py-6">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-9 w-28" />
      </CardContent>
    </Card>
  );
}

export default function ClassSessionDetailPageClient({
  classSession,
  backHref,
  backLabel,
  attendanceSessionsPromise,
  summaryPromise,
  leaveRequestsPromise,
  emailStatusPromise,
}: Props) {
  const statusInfo =
    CLASS_SESSION_STATUS_MAP[getEffectiveStatus(classSession.startTime, classSession.endTime)];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground w-fit cursor-pointer pl-1"
        >
          <Link href={backHref}>
            <ArrowLeft /> {backLabel}
          </Link>
        </Button>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-paytone text-foreground text-2xl tracking-tight">
              {classSession.title}
            </h1>
            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          </div>
        </div>
      </div>

      <ClassSessionInfoSection classSession={classSession} />

      <Suspense fallback={<AttendanceSectionsSkeleton />}>
        <AttendanceSectionsGroup
          classSession={classSession}
          attendanceSessionsPromise={attendanceSessionsPromise}
          summaryPromise={summaryPromise}
        />
      </Suspense>

      {emailStatusPromise && (
        <Suspense fallback={<AttendanceEmailSkeleton />}>
          <AttendanceEmailSection classSessionId={classSession.id} promise={emailStatusPromise} />
        </Suspense>
      )}

      <Suspense fallback={<LeaveRequestsSkeleton />}>
        <LeaveRequestsSectionWrapper promise={leaveRequestsPromise} />
      </Suspense>
    </div>
  );
}
