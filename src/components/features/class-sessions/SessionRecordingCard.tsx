'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BellRing,
  PlaySquare,
  RefreshCw,
  Replace,
  Trash2,
  Video,
} from 'lucide-react';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import RecordingPickerDialog from '@/components/features/class-sessions/RecordingPickerDialog';
import { removeSessionRecordingAction } from '@/actions/v1/session-recordings/remove-session-recording';
import { sendRecordingRemindersAction } from '@/actions/v1/session-recordings/send-recording-reminders';
import { handleActionResult } from '@/lib/actions';
import { formatDateTime, formatDateTimeShort } from '@/lib/format';
import { formatVideoDuration } from '@/lib/session-recordings';
import { ATTENDANCE_NOTIFY_STATUS_LABEL } from '@/types/actions/attendance';
import { COURSE_STATUS_LABEL } from '@/types/course-management';
import type {
  RecordingStudentRow,
  SessionRecordingStatus,
} from '@/types/actions/session-recordings';

interface Props {
  classSessionId: number;
  status: SessionRecordingStatus | null;
}

type Confirm = 'remove' | 'remind';

function NoticeCell({ student }: { student: RecordingStudentRow }) {
  const { notice } = student;
  if (!notice) {
    return <span className="text-muted-foreground">Chưa báo</span>;
  }
  const channel =
    notice.channel === 'ATTENDANCE_MAIL' ? 'Trong email điểm danh' : 'Email nhắc riêng';
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span>{channel}</span>
        {notice.deliveryStatus === 'SENT' && <Badge variant="success">Đã gửi</Badge>}
        {notice.deliveryStatus === 'PENDING' && <Badge variant="secondary">Đang gửi</Badge>}
        {notice.deliveryStatus === 'FAILED' && <Badge variant="destructive">Lỗi</Badge>}
      </div>
      {notice.sentAt && (
        <p className="text-muted-foreground text-xs">{formatDateTimeShort(notice.sentAt)}</p>
      )}
      {notice.deliveryStatus === 'FAILED' && notice.error && (
        <p className="text-destructive max-w-56 text-xs whitespace-normal">{notice.error}</p>
      )}
    </div>
  );
}

function WatchCell({ student }: { student: RecordingStudentRow }) {
  const { watch } = student;
  if (!watch || (watch.coveragePercent <= 0 && watch.completedViews === 0)) {
    return <span className="text-muted-foreground">Chưa xem</span>;
  }
  return (
    <div className="space-y-1">
      {watch.completedViews > 0 ? (
        <Badge variant="success">Đã xem hết</Badge>
      ) : (
        <Badge variant="warning">Đã xem {watch.coveragePercent}%</Badge>
      )}
      <p className="text-muted-foreground text-xs">
        Lần cuối {formatDateTimeShort(watch.lastViewedAt)}
      </p>
    </div>
  );
}

function EnrollmentCell({ student }: { student: RecordingStudentRow }) {
  return (
    <div className="space-y-1">
      {student.enrolled ? (
        <Badge variant="success">Đã ghi danh</Badge>
      ) : (
        <Badge variant="warning">Chưa ghi danh</Badge>
      )}
      {student.userStatus === 'UNACTIVATED' && (
        <p className="text-muted-foreground text-xs">Tài khoản chưa kích hoạt</p>
      )}
    </div>
  );
}

export default function SessionRecordingCard({ classSessionId, status }: Props) {
  const router = useRouter();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);

  const recording = status?.recording ?? null;
  const students = status?.students ?? [];
  const notEnrolled = recording ? students.filter((s) => !s.enrolled).length : 0;
  const duration = formatVideoDuration(recording?.durationSeconds);
  const canRemind = !!status && !!recording && status.enabled && !!status.attendanceNotifiedAt;

  const handleConfirm = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      if (confirm === 'remove') {
        const result = await removeSessionRecordingAction(classSessionId);
        if (handleActionResult(result.errors, () => router.refresh(), 'Đã gỡ record')) {
          setConfirm(null);
        }
      } else {
        const result = await sendRecordingRemindersAction(classSessionId);
        const ok = handleActionResult(
          result.errors,
          () => router.refresh(),
          `Đã đưa ${result.queued ?? 0} email nhắc xem lại vào hàng đợi gửi`,
        );
        if (ok) setConfirm(null);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Video className="text-muted-foreground size-5" /> Record buổi học
          </CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Gắn một video bài giảng có sẵn trong khóa học để học sinh vắng xem lại. Học sinh vắng
            đang ghi danh khóa đó nhận link qua email.
          </p>
        </div>
        {status && status.counts.pending > 0 && (
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
          <p className="text-muted-foreground text-sm">Không tải được thông tin record.</p>
        ) : (
          <>
            {recording ? (
              <div className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center">
                {recording.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- thumbnail Bunny, domain ngoài
                  <img
                    src={recording.thumbnailUrl}
                    alt=""
                    className="aspect-video w-full rounded object-cover sm:w-36"
                  />
                ) : (
                  <div className="bg-muted text-muted-foreground flex aspect-video w-full items-center justify-center rounded sm:w-36">
                    <PlaySquare className="size-8" aria-hidden />
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="font-medium break-words">{recording.title}</p>
                  <p className="text-muted-foreground text-sm">
                    Khóa học:{' '}
                    <Link
                      href={`/admin/courses/${recording.courseId}`}
                      className="text-primary font-medium hover:underline"
                    >
                      {recording.courseTitle}
                    </Link>
                    {duration ? ` · ${duration}` : ''}
                  </p>
                  {recording.attachedAt && (
                    <p className="text-muted-foreground text-xs">
                      Gắn lúc {formatDateTime(recording.attachedAt)}
                    </p>
                  )}
                  {!recording.openable && (
                    <p className="text-destructive flex items-center gap-1 text-sm">
                      <AlertTriangle className="size-4 shrink-0" aria-hidden />
                      {recording.courseStatus !== 'PUBLISHED'
                        ? `Khóa học đang ở trạng thái "${COURSE_STATUS_LABEL[recording.courseStatus]}" — học sinh chưa mở được video.`
                        : 'Video hiện không xem được (đang xử lý lại hoặc lỗi) — học sinh chưa mở được.'}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 sm:flex-col">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPickerOpen(true)}
                    className="cursor-pointer"
                  >
                    <Replace className="size-4" /> Đổi video
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirm('remove')}
                    className="text-destructive hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="size-4" /> Gỡ record
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed p-4">
                <p className="text-muted-foreground text-sm">
                  Buổi học chưa có record.
                  {students.length > 0 && ` Có ${students.length} học sinh vắng buổi này.`}
                </p>
                <Button onClick={() => setPickerOpen(true)} className="cursor-pointer">
                  <Video className="size-4" /> Chọn video
                </Button>
              </div>
            )}

            {recording && notEnrolled > 0 && (
              <div
                role="status"
                className="flex gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800"
              >
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>{notEnrolled} học sinh vắng chưa ghi danh khoá này nên không nhận được link.</p>
              </div>
            )}

            {recording && (
              <div className="space-y-3">
                {!status.enabled ? (
                  <p className="text-muted-foreground text-sm">
                    Lớp này chưa bật email kết quả điểm danh nên hệ thống không gửi email về record.
                    Học sinh vẫn thấy record trong trang buổi học.
                  </p>
                ) : !status.attendanceNotifiedAt ? (
                  <p className="text-muted-foreground text-sm">
                    Email điểm danh chưa gửi — link xem lại sẽ đi kèm email đó cho học sinh vắng đã
                    ghi danh khóa.
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="success">Đã báo {status.counts.sent}</Badge>
                      {status.counts.pending > 0 && (
                        <Badge variant="secondary">Đang gửi {status.counts.pending}</Badge>
                      )}
                      {status.counts.failed > 0 && (
                        <Badge variant="destructive">Lỗi {status.counts.failed}</Badge>
                      )}
                      {status.counts.needsReminder > 0 && (
                        <Badge variant="warning">Cần nhắc {status.counts.needsReminder}</Badge>
                      )}
                      <Badge variant="outline">
                        Đã xem {status.counts.watched}/{status.counts.missed}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setConfirm('remind')}
                      disabled={!canRemind || status.counts.needsReminder === 0}
                      className="cursor-pointer"
                    >
                      <BellRing className="size-4" /> Gửi nhắc xem lại
                      {status.counts.needsReminder > 0 ? ` (${status.counts.needsReminder})` : ''}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {recording && students.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Học sinh vắng</TableHead>
                    <TableHead>Điểm danh</TableHead>
                    <TableHead>Khóa học</TableHead>
                    <TableHead>Đã báo link</TableHead>
                    <TableHead>Xem record</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s) => (
                    <TableRow key={s.studentId}>
                      <TableCell>
                        <p className="font-medium">{s.fullName || s.email}</p>
                        {s.fullName && <p className="text-muted-foreground text-xs">{s.email}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={s.attendanceStatus === 'ON_LEAVE' ? 'warning' : 'destructive'}
                        >
                          {ATTENDANCE_NOTIFY_STATUS_LABEL[s.attendanceStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <EnrollmentCell student={s} />
                      </TableCell>
                      <TableCell>
                        <NoticeCell student={s} />
                      </TableCell>
                      <TableCell>
                        <WatchCell student={s} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {recording && students.length === 0 && (
              <p className="text-muted-foreground text-sm">Không có học sinh nào vắng buổi này.</p>
            )}
          </>
        )}
      </CardContent>

      {pickerOpen && status && (
        <RecordingPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          classSessionId={classSessionId}
          current={recording ? { courseId: recording.courseId, nodeId: recording.nodeId } : null}
          missedStudents={students}
          onSaved={() => router.refresh()}
        />
      )}

      <AlertDialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === 'remove' ? 'Gỡ record khỏi buổi học?' : 'Gửi email nhắc xem lại?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'remove'
                ? 'Học sinh sẽ không thấy record trong trang buổi học nữa. Email đã gửi không thu hồi được; email điểm danh gửi sau này sẽ không kèm link.'
                : `Gửi email có link xem lại tới ${status?.counts.needsReminder ?? 0} học sinh vắng chưa nhận link của video này (kể cả email trước đó bị lỗi).`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy} className="cursor-pointer">
              Huỷ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirm();
              }}
              disabled={busy}
              className={
                confirm === 'remove'
                  ? 'bg-destructive hover:bg-destructive/90 cursor-pointer'
                  : 'cursor-pointer'
              }
            >
              {busy ? 'Đang xử lý...' : confirm === 'remove' ? 'Gỡ record' : 'Gửi email'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
