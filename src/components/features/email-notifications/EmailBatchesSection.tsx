'use client';

import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Inbox, RefreshCw } from 'lucide-react';
import DataPagination from '@/components/app/DataPagination';
import EmptyState from '@/components/app/EmptyState';
import { ALL_VALUE } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/format';
import {
  EMAIL_NOTIFICATION_TYPE_LABEL,
  type EmailNotificationType,
  type IListEmailBatchesResult,
} from '@/types/actions/email-notifications';
import EmailBatchDialog from './EmailBatchDialog';

interface Props {
  result: IListEmailBatchesResult;
  type?: EmailNotificationType;
}

export default function EmailBatchesSection({ result, type }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openId, setOpenId] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(result.meta.total / result.meta.pageSize));

  function pushParams(next: { page?: number; type?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.type !== undefined) {
      if (next.type === ALL_VALUE) params.delete('type');
      else params.set('type', next.type);
      params.delete('page');
    }
    if (next.page !== undefined) params.set('page', String(next.page));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Lịch sử gửi</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Mỗi dòng là một lượt gửi. Bấm vào để xem từng học sinh, nội dung email và gửi lại email
            lỗi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={type ?? ALL_VALUE} onValueChange={(v) => pushParams({ type: v })}>
            <SelectTrigger className="w-44 cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Tất cả loại email</SelectItem>
              {(Object.keys(EMAIL_NOTIFICATION_TYPE_LABEL) as EmailNotificationType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {EMAIL_NOTIFICATION_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.refresh()}
            aria-label="Làm mới"
            className="cursor-pointer"
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 pb-4 sm:pb-6">
        {result.data.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Chưa có lượt gửi nào"
            description="Email lịch học, bài tập và tổng kết tháng sẽ hiện ở đây sau khi được gửi."
          />
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Nội dung</TableHead>
                  <TableHead>Kết quả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.data.map((b) => (
                  <TableRow
                    key={b.id}
                    onClick={() => setOpenId(b.id)}
                    className="hover:bg-muted/50 cursor-pointer"
                  >
                    <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                      {formatDateTime(b.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{EMAIL_NOTIFICATION_TYPE_LABEL[b.type]}</Badge>
                    </TableCell>
                    <TableCell className="max-w-80">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenId(b.id);
                        }}
                        className="hover:text-purple cursor-pointer truncate text-left font-medium hover:underline"
                      >
                        {b.label}
                      </button>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="success">Đã gửi {b.counts.sent}</Badge>
                        {b.counts.pending > 0 && (
                          <Badge variant="secondary">Đang gửi {b.counts.pending}</Badge>
                        )}
                        {b.counts.failed > 0 && (
                          <Badge variant="destructive">Lỗi {b.counts.failed}</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex justify-end">
          <DataPagination
            page={result.meta.page}
            totalPages={totalPages}
            onPageChange={(page) => pushParams({ page })}
          />
        </div>
      </CardContent>

      <EmailBatchDialog
        batchId={openId}
        onOpenChange={(open) => {
          if (!open) setOpenId(null);
        }}
      />
    </Card>
  );
}
