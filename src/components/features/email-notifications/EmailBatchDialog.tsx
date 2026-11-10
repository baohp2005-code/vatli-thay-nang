'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Eye, RotateCcw } from 'lucide-react';
import { getEmailBatch, getEmailContent } from '@/actions/v1/email-notifications/get-email-batch';
import { retryEmailBatchAction } from '@/actions/v1/email-notifications/send-email-notifications';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { handleActionErrors, handleActionResult } from '@/lib/actions';
import { formatDateTime } from '@/lib/format';
import type { NotificationDeliveryStatus } from '@/types/actions/attendance';
import {
  EMAIL_NOTIFICATION_TYPE_LABEL,
  type EmailBatchDetail,
  type EmailContent,
} from '@/types/actions/email-notifications';
import EmailHtmlPreview from './EmailHtmlPreview';

export const DELIVERY_STATUS_META: Record<
  NotificationDeliveryStatus,
  { label: string; variant: 'success' | 'destructive' | 'secondary' }
> = {
  SENT: { label: 'Đã gửi', variant: 'success' },
  FAILED: { label: 'Lỗi', variant: 'destructive' },
  PENDING: { label: 'Đang gửi', variant: 'secondary' },
};

interface Props {
  batchId: number | null;
  onOpenChange: (open: boolean) => void;
}

export default function EmailBatchDialog({ batchId, onOpenChange }: Props) {
  return (
    <Dialog open={batchId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        {batchId !== null && <BatchDetail key={batchId} batchId={batchId} />}
      </DialogContent>
    </Dialog>
  );
}

function BatchDetail({ batchId }: { batchId: number }) {
  const router = useRouter();
  const [batch, setBatch] = useState<EmailBatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [content, setContent] = useState<EmailContent | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void getEmailBatch(batchId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.data) return handleActionErrors(res.errors);
      setBatch(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, [batchId, reloadKey]);

  async function openContent(notificationId: number) {
    const res = await getEmailContent(notificationId);
    if (!res.data) return handleActionErrors(res.errors);
    setContent(res.data);
  }

  async function retry() {
    setRetrying(true);
    try {
      const res = await retryEmailBatchAction(batchId);
      handleActionResult(
        res.errors,
        () => {
          setReloadKey((k) => k + 1);
          router.refresh();
        },
        `Đã đưa ${res.queued ?? 0} email vào hàng đợi gửi lại`,
      );
    } finally {
      setRetrying(false);
    }
  }

  if (content) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="pr-6">{content.subject}</DialogTitle>
          <DialogDescription>Gửi tới {content.email}</DialogDescription>
        </DialogHeader>
        <EmailHtmlPreview html={content.html} title={content.subject} />
        <Button variant="outline" onClick={() => setContent(null)} className="w-fit cursor-pointer">
          <ArrowLeft className="size-4" /> Quay lại danh sách
        </Button>
      </>
    );
  }

  if (loading || !batch) {
    return (
      <div className="space-y-3" role="status" aria-label="Đang tải lượt gửi">
        <DialogTitle className="sr-only">Chi tiết lượt gửi</DialogTitle>
        <Skeleton className="h-6 w-64" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="pr-6">{batch.label}</DialogTitle>
        <DialogDescription>
          {EMAIL_NOTIFICATION_TYPE_LABEL[batch.type]} · tạo lúc {formatDateTime(batch.createdAt)}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="success">Đã gửi {batch.counts.sent}</Badge>
          {batch.counts.pending > 0 && (
            <Badge variant="secondary">Đang gửi {batch.counts.pending}</Badge>
          )}
          {batch.counts.failed > 0 && (
            <Badge variant="destructive">Lỗi {batch.counts.failed}</Badge>
          )}
        </div>
        {batch.counts.failed > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={retry}
            disabled={retrying}
            className="cursor-pointer"
          >
            <RotateCcw className="size-4" /> {retrying ? 'Đang gửi lại…' : 'Gửi lại email lỗi'}
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Học sinh</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead>Gửi lúc</TableHead>
              <TableHead className="text-right">Nội dung</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batch.notifications.map((n) => {
              const meta = DELIVERY_STATUS_META[n.deliveryStatus];
              return (
                <TableRow key={n.id}>
                  <TableCell className="max-w-56">
                    <div className="truncate font-medium">{n.fullName ?? n.email}</div>
                    {n.fullName && (
                      <div className="text-muted-foreground truncate text-xs">{n.email}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    {n.error && <p className="text-destructive mt-1 text-xs">{n.error}</p>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {n.sentAt ? formatDateTime(n.sentAt) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openContent(n.id)}
                      className="cursor-pointer"
                    >
                      <Eye className="size-4" /> Xem
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
