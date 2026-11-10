import { redirect } from 'next/navigation';
import { getEmailSchedule } from '@/actions/v1/email-notifications/get-email-schedule';
import { listEmailBatches } from '@/actions/v1/email-notifications/list-email-batches';
import { getCurrentSession } from '@/lib/server/session';
import {
  EMAIL_NOTIFICATION_TYPE_LABEL,
  type EmailNotificationType,
} from '@/types/actions/email-notifications';
import EmailNotificationsPageClient from './EmailNotificationsPageClient';

interface Props {
  searchParams: Promise<Record<string, string | undefined>>;
}

function pickType(raw: string | undefined): EmailNotificationType | undefined {
  return raw && raw in EMAIL_NOTIFICATION_TYPE_LABEL ? (raw as EmailNotificationType) : undefined;
}

export default async function EmailNotificationsPage({ searchParams }: Props) {
  const session = await getCurrentSession();
  // Email tự động là việc của ADMIN — BE cũng chặn 403 với Trợ giảng.
  if (session?.role === 'TEACHING_ASSISTANT') redirect('/admin/classes');

  const sp = await searchParams;
  const page = Number(sp.page);
  const urlState = {
    page: Number.isInteger(page) && page >= 1 ? page : 1,
    type: pickType(sp.type),
  };

  // Không await — stream xuống qua Suspense.
  const schedulePromise = getEmailSchedule();
  const batchesPromise = listEmailBatches({
    page: urlState.page,
    pageSize: 20,
    type: urlState.type,
  });

  return (
    <EmailNotificationsPageClient
      urlState={urlState}
      schedulePromise={schedulePromise}
      batchesPromise={batchesPromise}
    />
  );
}
