'use client';

import { useEffect, useState } from 'react';
import {
  listMonthlyRecipients,
  previewMonthlyReport,
} from '@/actions/v1/email-notifications/monthly-report-preview';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { handleActionErrors } from '@/lib/actions';
import type { MonthlyRecipient, MonthlyReportPreview } from '@/types/actions/email-notifications';
import EmailHtmlPreview from './EmailHtmlPreview';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MonthlyPreviewDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Xem trước email tổng kết tháng</DialogTitle>
          <DialogDescription>
            Số liệu tháng hiện tại tính tới lúc này. Chỉ xem, không gửi email.
          </DialogDescription>
        </DialogHeader>
        {open && <PreviewBody />}
      </DialogContent>
    </Dialog>
  );
}

function PreviewBody() {
  const [recipients, setRecipients] = useState<MonthlyRecipient[] | null>(null);
  const [studentId, setStudentId] = useState('');
  const [preview, setPreview] = useState<MonthlyReportPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listMonthlyRecipients().then((res) => {
      if (cancelled) return;
      if (res.errors.length) handleActionErrors(res.errors);
      setRecipients(res.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function choose(value: string) {
    setStudentId(value);
    setPreview(null);
    setLoadingPreview(true);
    try {
      const res = await previewMonthlyReport(Number(value));
      if (!res.data) return handleActionErrors(res.errors);
      setPreview(res.data);
    } finally {
      setLoadingPreview(false);
    }
  }

  if (recipients === null) {
    return <Skeleton className="h-9 w-full" role="status" aria-label="Đang tải học sinh" />;
  }

  if (recipients.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Chưa có học sinh nào sẽ nhận tổng kết tháng. Hãy bật{' '}
        <span className="text-foreground font-medium">Gửi email tổng kết tháng</span> trong phần sửa
        lớp học.
      </p>
    );
  }

  return (
    <div className="min-w-0 space-y-3">
      <div className="space-y-1.5">
        <Label>Học sinh</Label>
        <Select value={studentId} onValueChange={choose}>
          <SelectTrigger className="w-full cursor-pointer sm:w-96">
            <SelectValue placeholder={`Chọn trong ${recipients.length} học sinh sẽ nhận email`} />
          </SelectTrigger>
          <SelectContent>
            {recipients.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.fullName ? `${r.fullName} · ${r.email}` : r.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadingPreview && <Skeleton className="h-[60vh] w-full" />}
      {preview && (
        <>
          {preview.empty && (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Tháng này em chưa có dữ liệu nào — khi gửi thật, hệ thống bỏ qua em này để tiết kiệm
              hạn mức email.
            </p>
          )}
          <p className="text-sm">
            <span className="text-muted-foreground">Tiêu đề:</span>{' '}
            <span className="font-medium">{preview.subject}</span>
          </p>
          <EmailHtmlPreview html={preview.html} title={preview.subject} />
        </>
      )}
    </div>
  );
}
