'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpenCheck, CalendarDays, ClipboardCheck, Eye, FileBarChart, Send } from 'lucide-react';
import {
  sendMonthlyReportAction,
  sendWeeklyScheduleAction,
  type EmailActionResult,
} from '@/actions/v1/email-notifications/send-email-notifications';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { handleActionResult } from '@/lib/actions';
import { formatDateTime } from '@/lib/format';
import type { EmailSchedule } from '@/types/actions/email-notifications';
import MonthlyPreviewDialog from './MonthlyPreviewDialog';

type SendKind = 'WEEK_CURRENT' | 'WEEK_NEXT' | 'MONTHLY';

const CONFIRM: Record<SendKind, { title: string; description: string }> = {
  WEEK_CURRENT: {
    title: 'Gửi lịch học tuần này?',
    description:
      'Mỗi học sinh của các lớp đã bật email lịch học nhận danh sách các buổi CÒN LẠI trong tuần này. Học sinh đã nhận lịch tuần này (vd lúc 8h thứ 2) sẽ không nhận lại.',
  },
  WEEK_NEXT: {
    title: 'Gửi trước lịch học tuần sau?',
    description:
      'Học sinh nhận ngay các buổi của tuần sau (từ 8h thứ 2 tới hết chủ nhật). 8h sáng thứ 2 hệ thống sẽ bỏ qua những em đã nhận nên không bị trùng.',
  },
  MONTHLY: {
    title: 'Gửi tổng kết tháng ngay?',
    description:
      'Mỗi học sinh nhận tổng kết tháng hiện tại, tính tới thời điểm bấm. Đây là lượt gửi riêng — 20h ngày cuối tháng hệ thống vẫn gửi bản tổng kết chính thức.',
  },
};

const ACTION: Record<SendKind, () => Promise<EmailActionResult>> = {
  WEEK_CURRENT: () => sendWeeklyScheduleAction('CURRENT'),
  WEEK_NEXT: () => sendWeeklyScheduleAction('NEXT'),
  MONTHLY: () => sendMonthlyReportAction(),
};

interface Props {
  schedule: EmailSchedule | null;
}

export default function EmailScheduleSection({ schedule }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<SendKind | null>(null);
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  async function handleConfirm() {
    if (!confirm) return;
    setSending(true);
    try {
      const res = await ACTION[confirm]();
      if (!res.errors.length && res.queued === 0) {
        toast.info(
          'Không có học sinh nào cần nhận email (lớp chưa bật, không có dữ liệu, hoặc đã nhận rồi)',
        );
        setConfirm(null);
        return;
      }
      const ok = handleActionResult(
        res.errors,
        () => router.refresh(),
        `Đã đưa ${res.queued ?? 0} email vào hàng đợi gửi`,
      );
      if (ok) setConfirm(null);
    } finally {
      setSending(false);
    }
  }

  const next = (iso: string | null | undefined) =>
    iso ? (
      <span className="text-foreground font-medium">{formatDateTime(iso)}</span>
    ) : (
      <span className="text-destructive">chưa đăng ký lịch (kiểm tra Redis ở backend)</span>
    );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="text-muted-foreground size-5" /> Lịch học tuần
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4 text-sm sm:pb-6">
          <p className="text-muted-foreground">
            8h sáng thứ 2, mỗi học sinh nhận các buổi học trong tuần (8h thứ 2 → 23h59 chủ nhật) của
            lớp. Buổi xa hơn tuần đó không được tính.
          </p>
          <p>Lần gửi tới: {next(schedule?.weekly)}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirm('WEEK_CURRENT')}
              className="cursor-pointer"
            >
              <Send className="size-4" /> Gửi ngay tuần này
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirm('WEEK_NEXT')}
              className="cursor-pointer"
            >
              <Send className="size-4" /> Gửi trước tuần sau
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileBarChart className="text-muted-foreground size-5" /> Tổng kết tháng
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-4 text-sm sm:pb-6">
          <p className="text-muted-foreground">
            20h ngày cuối tháng: chuyên cần, video đã xem trong tháng, điểm + xếp hạng bài kiểm tra,
            bài đã hết hạn mà chưa nộp. Mỗi học sinh một email.
          </p>
          <p>Lần gửi tới: {next(schedule?.monthly)}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              className="cursor-pointer"
            >
              <Eye className="size-4" /> Xem trước
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirm('MONTHLY')}
              className="cursor-pointer"
            >
              <Send className="size-4" /> Gửi ngay
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpenCheck className="text-muted-foreground size-5" /> Bài tập về nhà
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 pb-4 text-sm sm:pb-6">
          <p>
            Khi đăng bài tập có tích <span className="text-foreground">Gửi email cho học sinh</span>
            : gửi ngay thông báo bài mới, và 24 giờ trước hạn nộp nhắc những em chưa nộp.
          </p>
          <p>
            Tạo bài tập ở mục <span className="text-foreground">Bài tập & bài kiểm tra</span> trong
            từng{' '}
            <Link href="/admin/courses" className="text-primary font-medium hover:underline">
              khóa học
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="text-muted-foreground size-5" /> Kết quả điểm danh
          </CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 pb-4 text-sm sm:pb-6">
          <p>
            Gửi sau mỗi buổi học, hoặc bấm <span className="text-foreground">Gửi ngay</span> ở trang
            buổi học khi đã điểm danh xong cả lớp. Theo dõi ở trang từng buổi học.
          </p>
          <p>
            Bật / tắt từng loại email theo lớp ở nút <span className="text-foreground">Sửa</span>{' '}
            trong trang{' '}
            <Link href="/admin/classes" className="text-primary font-medium hover:underline">
              Lớp học
            </Link>
            .
          </p>
        </CardContent>
      </Card>

      <MonthlyPreviewDialog open={previewOpen} onOpenChange={setPreviewOpen} />

      <AlertDialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !sending) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm ? CONFIRM[confirm].title : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm ? CONFIRM[confirm].description : ''} Email đã gửi không thể thu hồi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending} className="cursor-pointer">
              Huỷ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirm();
              }}
              disabled={sending}
              className="cursor-pointer"
            >
              {sending ? 'Đang gửi...' : 'Gửi email'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
