'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Mail, RefreshCw, RotateCcw, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { handleActionResult } from '@/lib/actions';
import { formatDateTime } from '@/lib/format';
import { sendAttendanceEmailsAction } from '@/actions/v1/attendance-notifications/send-attendance-emails';
import {
  ATTENDANCE_NOTIFY_STATUS_LABEL,
  type AttendanceEmailSendMode,
  type AttendanceEmailStatus,
} from '@/types/actions/attendance';

interface Props {
  classSessionId: number;
  status: AttendanceEmailStatus | null;
}

const CONFIRM_TITLE: Record<AttendanceEmailSendMode, string> = {
  ALL: 'Gửi email kết quả điểm danh?',
  FAILED: 'Gửi lại các email bị lỗi?',
  CHANGED: 'Gửi lại cho học sinh có thay đổi?',
};

function confirmDescription(mode: AttendanceEmailSendMode, count: number): string {
  if (mode === 'ALL') {
    return `Hệ thống sẽ gửi email kết quả điểm danh tới ${count} học sinh. Email đã gửi không thể thu hồi.`;
  }
  if (mode === 'FAILED') {
    return `Gửi lại email cho ${count} học sinh bị lỗi, theo kết quả điểm danh hiện tại.`;
  }
  return `Gửi email mới cho ${count} học sinh có kết quả thay đổi sau lần gửi trước.`;
}

export default function AttendanceEmailCard({ classSessionId, status }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState<{ mode: AttendanceEmailSendMode; count: number } | null>(
    null,
  );
  const [sending, setSending] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleConfirm = async () => {
    if (!confirm) return;
    setSending(true);
    try {
      const result = await sendAttendanceEmailsAction(classSessionId, confirm.mode);
      const ok = handleActionResult(
        result.errors,
        () => router.refresh(),
        `Đã đưa ${result.queued ?? 0} email vào hàng đợi gửi`,
      );
      if (ok) setConfirm(null);
    } finally {
      setSending(false);
    }
  };

  const attention =
    status?.students.filter((s) => s.deliveryStatus === 'FAILED' || s.changed) ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Mail className="text-muted-foreground size-5" /> Email kết quả điểm danh
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Sau buổi học, mỗi học sinh nhận một email báo có mặt, vắng có phép (kèm lý do) hoặc vắng
            không phép.
          </p>
        </div>
        {status?.notifiedAt && status.counts.pending > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="cursor-pointer self-start"
          >
            <RefreshCw className="size-4" /> Làm mới
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pb-4 sm:pb-6">
        {!status ? (
          <p className="text-muted-foreground text-sm">
            Không tải được trạng thái email điểm danh.
          </p>
        ) : !status.enabled ? (
          <p className="text-muted-foreground text-sm">
            Lớp này chưa bật gửi email kết quả điểm danh. Bật ở nút{' '}
            <span className="text-foreground font-medium">Sửa</span> của lớp trong trang{' '}
            <Link href="/admin/classes" className="text-primary font-medium hover:underline">
              Lớp học
            </Link>
            .
          </p>
        ) : !status.notifiedAt ? (
          !status.hasAttendanceSession ? (
            <p className="text-muted-foreground text-sm">
              Buổi học chưa mở phiên điểm danh nào nên hệ thống sẽ không gửi email cho buổi này.
            </p>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm">
                Hẹn tự động gửi lúc{' '}
                <span className="font-medium">
                  {status.scheduledFor ? formatDateTime(status.scheduledFor) : '—'}
                </span>
                .
                {!status.ended && (
                  <span className="text-muted-foreground">
                    {' '}
                    Có thể gửi ngay sau khi buổi học và phiên điểm danh kết thúc.
                  </span>
                )}
              </p>
              {status.ended && (
                <Button
                  onClick={() => setConfirm({ mode: 'ALL', count: status.students.length })}
                  className="cursor-pointer"
                >
                  <Send className="size-4" /> Gửi ngay
                </Button>
              )}
            </div>
          )
        ) : (
          <>
            <div className="space-y-3">
              <p className="text-sm">
                Đã gửi lúc <span className="font-medium">{formatDateTime(status.notifiedAt)}</span>.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="success">Đã gửi {status.counts.sent}</Badge>
                {status.counts.pending > 0 && (
                  <Badge variant="secondary">Đang gửi {status.counts.pending}</Badge>
                )}
                {status.counts.failed > 0 && (
                  <Badge variant="destructive">Lỗi {status.counts.failed}</Badge>
                )}
                {status.counts.changed > 0 && (
                  <Badge variant="warning">Có thay đổi sau khi gửi {status.counts.changed}</Badge>
                )}
              </div>
            </div>

            {(status.counts.failed > 0 || status.counts.changed > 0) && (
              <div className="flex flex-wrap gap-2">
                {status.counts.failed > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setConfirm({ mode: 'FAILED', count: status.counts.failed })}
                    className="cursor-pointer"
                  >
                    <RotateCcw className="size-4" /> Gửi lại email lỗi
                  </Button>
                )}
                {status.counts.changed > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setConfirm({ mode: 'CHANGED', count: status.counts.changed })}
                    className="cursor-pointer"
                  >
                    <Send className="size-4" /> Gửi lại cho {status.counts.changed} học sinh có thay
                    đổi
                  </Button>
                )}
              </div>
            )}

            {attention.length > 0 && (
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails((v) => !v)}
                  aria-expanded={showDetails}
                  className="text-muted-foreground cursor-pointer pl-1"
                >
                  {showDetails ? (
                    <ChevronUp className="size-4" />
                  ) : (
                    <ChevronDown className="size-4" />
                  )}
                  {showDetails ? 'Ẩn chi tiết' : `Xem chi tiết (${attention.length} học sinh)`}
                </Button>
                {showDetails && (
                  <ul className="divide-y rounded-md border">
                    {attention.map((s) => (
                      <li key={s.studentId} className="space-y-0.5 px-3 py-2 text-sm">
                        <p className="font-medium">
                          {s.fullName || s.email}
                          {s.fullName && (
                            <span className="text-muted-foreground font-normal"> · {s.email}</span>
                          )}
                        </p>
                        {s.changed && s.currentStatus && (
                          <p className="text-muted-foreground">
                            Đã báo:{' '}
                            {s.sentStatus
                              ? ATTENDANCE_NOTIFY_STATUS_LABEL[s.sentStatus]
                              : 'chưa gửi'}{' '}
                            → hiện tại: {ATTENDANCE_NOTIFY_STATUS_LABEL[s.currentStatus]}
                          </p>
                        )}
                        {s.deliveryStatus === 'FAILED' && s.error && (
                          <p className="text-destructive">{s.error}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>

      <AlertDialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !sending) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm ? CONFIRM_TITLE[confirm.mode] : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm ? confirmDescription(confirm.mode, confirm.count) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending} className="cursor-pointer">
              Huỷ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={sending}
              className="cursor-pointer"
            >
              {sending ? 'Đang gửi...' : 'Gửi email'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
