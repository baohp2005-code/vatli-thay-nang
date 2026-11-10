'use client';

import { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useResolved } from '@/lib/actions';
import EmailBatchesSection from '@/components/features/email-notifications/EmailBatchesSection';
import EmailScheduleSection from '@/components/features/email-notifications/EmailScheduleSection';
import type { GetEmailScheduleResponse } from '@/actions/v1/email-notifications/get-email-schedule';
import type { ListEmailBatchesResponse } from '@/actions/v1/email-notifications/list-email-batches';
import type { EmailNotificationType } from '@/types/actions/email-notifications';

interface Props {
  urlState: { page: number; type?: EmailNotificationType };
  schedulePromise: Promise<GetEmailScheduleResponse>;
  batchesPromise: Promise<ListEmailBatchesResponse>;
}

function ScheduleSectionWrapper({ promise }: { promise: Promise<GetEmailScheduleResponse> }) {
  const { data } = useResolved(promise);
  return <EmailScheduleSection schedule={data} />;
}

function BatchesSectionWrapper({
  promise,
  type,
}: {
  promise: Promise<ListEmailBatchesResponse>;
  type?: EmailNotificationType;
}) {
  const result = useResolved(promise);
  return <EmailBatchesSection result={result} type={type} />;
}

function CardSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="space-y-3 py-4 sm:py-6">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

export default function EmailNotificationsPageClient({
  urlState,
  schedulePromise,
  batchesPromise,
}: Props) {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="font-paytone text-foreground text-2xl tracking-tight">Email tự động</h1>
        <p className="text-muted-foreground text-sm">
          Email hệ thống tự gửi cho học sinh: lịch học tuần, bài tập, kết quả điểm danh và tổng kết
          tháng. Mỗi loại bật / tắt riêng theo lớp (bài tập: theo từng bài).
        </p>
      </div>

      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <ScheduleSectionWrapper promise={schedulePromise} />
      </Suspense>

      <Suspense fallback={<CardSkeleton rows={5} />}>
        <BatchesSectionWrapper promise={batchesPromise} type={urlState.type} />
      </Suspense>
    </div>
  );
}
