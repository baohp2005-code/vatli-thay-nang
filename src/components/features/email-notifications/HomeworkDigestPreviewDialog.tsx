'use client';

import { useEffect, useState } from 'react';
import {
  listHomeworkDigestRecipients,
  previewHomeworkDigest,
} from '@/actions/v1/email-notifications/homework-digest-preview';
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
import type {
  HomeworkDigestPreview,
  HomeworkDigestRecipient,
} from '@/types/actions/email-notifications';
import EmailHtmlPreview from './EmailHtmlPreview';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Ai sẽ nhận email "Bài tập còn nợ" nếu gửi lúc này, mỗi em nợ mấy bài + xem trước email. */
export default function HomeworkDigestPreviewDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Xem trước email bài tập còn nợ</DialogTitle>
          <DialogDescription>
            Tính tới lúc này: học sinh nào sẽ nhận email và mỗi em còn nợ bao nhiêu bài. Chỉ xem,
            không gửi email.
          </DialogDescription>
        </DialogHeader>
        {open && <PreviewBody />}
      </DialogContent>
    </Dialog>
  );
}

function countLabel(r: HomeworkDigestRecipient): string {
  const parts = [`${r.overdue + r.upcoming} bài`];
  if (r.overdue > 0) parts.push(`${r.overdue} quá hạn`);
  return parts.join(', ');
}

function PreviewBody() {
  const [recipients, setRecipients] = useState<HomeworkDigestRecipient[] | null>(null);
  const [studentId, setStudentId] = useState('');
  const [preview, setPreview] = useState<HomeworkDigestPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listHomeworkDigestRecipients().then((res) => {
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
      const res = await previewHomeworkDigest(Number(value));
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
        Không học sinh nào còn nợ bài tập (trong các bài có tích{' '}
        <span className="text-foreground font-medium">Gửi email cho học sinh</span>) — gửi lúc này
        sẽ không có email nào.
      </p>
    );
  }

  const totalOverdue = recipients.reduce((s, r) => s + r.overdue, 0);
  const totalItems = recipients.reduce((s, r) => s + r.overdue + r.upcoming, 0);

  return (
    <div className="min-w-0 space-y-3">
      <p className="text-sm">
        <span className="font-medium">{recipients.length}</span> học sinh sẽ nhận email, tổng{' '}
        <span className="font-medium">{totalItems}</span> bài chưa nộp
        {totalOverdue > 0 && (
          <>
            {' '}
            (<span className="font-medium text-amber-700">{totalOverdue}</span> bài đã quá hạn)
          </>
        )}
        .
      </p>
      <div className="space-y-1.5">
        <Label>Học sinh</Label>
        <Select value={studentId} onValueChange={choose}>
          <SelectTrigger className="w-full cursor-pointer sm:w-[28rem]">
            <SelectValue placeholder="Chọn học sinh để xem email" />
          </SelectTrigger>
          <SelectContent>
            {recipients.map((r) => (
              <SelectItem key={r.id} value={String(r.id)}>
                {r.fullName ? `${r.fullName} · ${r.email}` : r.email} — {countLabel(r)}
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
              Em này vừa nộp hết bài — khi gửi thật, hệ thống bỏ qua em này.
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
