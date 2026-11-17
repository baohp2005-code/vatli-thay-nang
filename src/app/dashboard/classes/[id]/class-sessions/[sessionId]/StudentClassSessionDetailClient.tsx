'use client';

import { Suspense, use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ClassSessionInfoSection from '@/components/features/class-sessions/ClassSessionInfoSection';
import StudentAttendancePanel from '@/components/features/class-sessions/StudentAttendancePanel';
import StudentRecordingCard from '@/components/features/class-sessions/StudentRecordingCard';
import { CLASS_SESSION_STATUS_MAP, getEffectiveStatus } from '@/lib/class-sessions';
import { useResolved } from '@/lib/actions';
import type { GetMyAttendanceResponse } from '@/actions/v1/attendance/get-my-attendance';
import type { GetMyLeaveRequestResult } from '@/actions/v1/leave-requests/get-my-leave-request';
import type { ClassSessionDetail } from '@/types/actions/class-management';

interface Props {
  classId: number;
  classSession: ClassSessionDetail;
  myAttendancePromise: Promise<GetMyAttendanceResponse>;
  myLeaveRequestPromise: Promise<GetMyLeaveRequestResult>;
}

function AttendancePanelSection({
  classSession,
  myAttendancePromise,
  myLeaveRequestPromise,
}: {
  classSession: ClassSessionDetail;
  myAttendancePromise: Promise<GetMyAttendanceResponse>;
  myLeaveRequestPromise: Promise<GetMyLeaveRequestResult>;
}) {
  const { data: myAttendance } = useResolved(myAttendancePromise);
  const { data: myLeaveRequest } = use(myLeaveRequestPromise);

  return (
    <StudentAttendancePanel
      classSessionId={classSession.id}
      startTime={classSession.startTime}
      endTime={classSession.endTime}
      activeAttendanceSession={classSession.activeAttendanceSession}
      myAttendance={myAttendance}
      myLeaveRequest={myLeaveRequest}
    />
  );
}

export function AttendancePanelSkeleton() {
  return (
    <Card>
      <CardContent className="space-y-3 py-4 sm:py-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}

export default function StudentClassSessionDetailClient({
  classId,
  classSession,
  myAttendancePromise,
  myLeaveRequestPromise,
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
          <Link href={`/dashboard/classes/${classId}`}>
            <ArrowLeft /> Quay lại danh sách buổi học
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-paytone text-foreground text-2xl tracking-tight">
            {classSession.title}
          </h1>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
      </div>

      <Suspense fallback={<AttendancePanelSkeleton />}>
        <AttendancePanelSection
          classSession={classSession}
          myAttendancePromise={myAttendancePromise}
          myLeaveRequestPromise={myLeaveRequestPromise}
        />
      </Suspense>

      {classSession.recording && <StudentRecordingCard recording={classSession.recording} />}

      <ClassSessionInfoSection classSession={classSession} />
    </div>
  );
}
