'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  FileText,
  Mail,
  MailCheck,
  MailX,
  Pencil,
  Sparkles,
  Target,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { exportSubmissionsAction } from '@/actions/v1/tests/export-submissions';
import { gradeSubmissionAction } from '@/actions/v1/tests/grade-submission';
import { cancelReopenSubmissionAction } from '@/actions/v1/tests/reopen-submission';
import ReopenSubmissionDialog from './ReopenSubmissionDialog';
import { listSubmissions, type ListSubmissionsResponse } from '@/actions/v1/tests/list-submissions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsTeachingAssistant } from '@/components/app/RoleProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import ColumnFilterHead, {
  type ColumnFilterOption,
} from '@/components/app/table-filters/ColumnFilterHead';
import ColumnSortHead from '@/components/app/table-filters/ColumnSortHead';
import TableSearchInput from '@/components/app/table-filters/TableSearchInput';
import { ALL_VALUE } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { handleActionErrors, handleActionResult, handleActionSuccess } from '@/lib/actions';
import {
  formatDateTime as formatDateTimeFull,
  formatDateTimeShort,
  formatTime,
} from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SortOrder } from '@/types/auth';
import {
  SCORE_EMAIL_DELAY_MINUTES,
  type ScoreEmailStatus,
  type SubmissionRow,
  type TestDetail,
  type TestFile,
  type TestPhase,
} from '@/types/tests';
import ScoreDistributionChart from './ScoreDistributionChart';
import TestAttachmentViewer, { GRADING_MODAL_SIZE } from './TestAttachmentViewer';
import TestFormModal from './TestFormModal';

interface Props {
  courseId: number;
  test: TestDetail;
  submissionsPromise: Promise<ListSubmissionsResponse>;
}

const PHASE: Record<TestPhase, { text: string; variant: 'secondary' | 'default' | 'outline' }> = {
  SCHEDULED: { text: 'Sắp diễn ra', variant: 'outline' },
  ONGOING: { text: 'Đang mở', variant: 'default' },
  ENDED: { text: 'Đã kết thúc', variant: 'secondary' },
};

const STATUS: Record<
  SubmissionRow['status'],
  { text: string; variant: 'secondary' | 'warning' | 'success' }
> = {
  NOT_SUBMITTED: { text: 'Chưa nộp', variant: 'secondary' },
  SUBMITTED: { text: 'Đã nộp', variant: 'warning' },
  GRADED: { text: 'Đã chấm', variant: 'success' },
};

const SUBMISSION_STATUS_OPTIONS: ColumnFilterOption[] = (
  Object.keys(STATUS) as SubmissionRow['status'][]
).map((value) => ({ value, label: STATUS[value].text }));

const SCORE_SORT_OPTIONS = [{ value: 'score' as const, label: 'Điểm' }];

function formatDateTime(iso: string | null): string {
  return iso ? formatDateTimeFull(iso) : '—';
}

/**
 * Tiêu đề + nút sửa/xuất file: chỉ cần `test` (đã có ngay, không phải chờ danh sách bài
 * nộp) nên render eager ở page.tsx, tách khỏi phần Suspense cho bảng/thống kê.
 */
export function TestHeaderBar({ courseId, test }: { courseId: number; test: TestDetail }) {
  const isTA = useIsTeachingAssistant();
  const [exporting, setExporting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const phase = PHASE[test.phase];

  async function handleExport(format: 'csv' | 'xlsx') {
    setExporting(true);
    try {
      const res = await exportSubmissionsAction(test.id, format);
      if (!res.blob) return handleActionErrors(res.errors);
      const url = URL.createObjectURL(res.blob);
      try {
        const a = document.createElement('a');
        a.href = url;
        a.download = res.filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } finally {
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-semibold">{test.title}</h1>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span>
            {formatDateTime(test.startTime)} → {formatDateTime(test.endTime)}
          </span>
          <span aria-hidden className="text-input-border">
            ·
          </span>
          {test.type === 'HOMEWORK' ? (
            <span>
              Bài tập · {test.emailNotify ? 'có email báo bài + nhắc hạn nộp' : 'không gửi email'}
            </span>
          ) : (
            <>
              <span>Thang điểm {test.maxScore}</span>
              <span aria-hidden className="text-input-border">
                ·
              </span>
              <span>Làm bài {test.durationMinutes} phút</span>
              <span aria-hidden className="text-input-border">
                ·
              </span>
              <span>{test.emailNotify ? 'Có email báo điểm' : 'Không gửi email báo điểm'}</span>
            </>
          )}
          <Badge variant={phase.variant}>{phase.text}</Badge>
        </div>
      </div>

      {!isTA && (
        <div className="flex gap-2">
          <Button onClick={() => setEditOpen(true)} className="cursor-pointer">
            <Pencil /> Sửa
          </Button>
          <Button
            variant="outline"
            disabled={exporting}
            onClick={() => void handleExport('csv')}
            className="cursor-pointer"
          >
            <Download /> CSV
          </Button>
          <Button
            variant="outline"
            disabled={exporting}
            onClick={() => void handleExport('xlsx')}
            className="cursor-pointer"
          >
            <Download /> Excel
          </Button>
        </div>
      )}

      {/* key theo editOpen để mỗi lần mở là remount → form nạp lại dữ liệu mới nhất
          (giống pattern key={editingId} ở CourseTestsSection). Lưu xong TestFormModal
          tự router.refresh() → page refetch getTest, header + đề bài cập nhật. */}
      {editOpen && (
        <TestFormModal
          key={test.id}
          open={editOpen}
          onOpenChange={setEditOpen}
          courseId={courseId}
          testId={test.id}
        />
      )}
    </div>
  );
}

/**
 * Card "Đề bài" cho admin xem lại các file đã upload (trước đây không hiển thị ở đâu —
 * TestAttachmentViewer chỉ được dùng cho bài nộp của học sinh trong dialog chấm).
 * Render eager ở page.tsx cùng TestHeaderBar vì attachments đi kèm sẵn trong `test`.
 */
export function TestAttachmentsCard({ attachments }: { attachments: TestFile[] }) {
  const isTA = useIsTeachingAssistant();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="text-muted-foreground size-4" />
          Đề bài
          <span className="text-muted-foreground text-sm font-normal">
            ({attachments.length} tệp)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4 sm:pb-6">
        {attachments.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {isTA ? (
              'Chưa đính kèm file đề.'
            ) : (
              <>
                Chưa đính kèm file đề — bấm <span className="font-medium">Sửa</span> để thêm.
              </>
            )}
          </p>
        ) : (
          // Đề nhiều trang ảnh rất dài — giới hạn chiều cao, cuộn trong card để phần
          // thống kê/bài nộp phía dưới không bị đẩy mất hút.
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <TestAttachmentViewer files={attachments} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminTestDetailClient({ courseId, test, submissionsPromise }: Props) {
  const isTA = useIsTeachingAssistant();
  const submissions = use(submissionsPromise);
  const [rows, setRows] = useState(submissions.data);
  const [stats, setStats] = useState(submissions.stats);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(ALL_VALUE);
  const [scoreSort, setScoreSort] = useState<{ value: 'score' | ''; order: SortOrder }>({
    value: '',
    order: 'desc',
  });

  // Hàng đợi chấm bài = danh sách studentId ĐÓNG BĂNG lúc mở panel, cùng vị trí hiện tại.
  //
  // Không dùng index vào mảng đã sort: chấm xong là bài đó nhảy xuống cuối (sort đưa bài
  // chưa chấm lên trước), nên index cũ + 1 sẽ trỏ sang một học sinh khác — admin bấm
  // "Bài tiếp" là bỏ sót người.
  const [queue, setQueue] = useState<{ ids: number[]; pos: number } | null>(null);
  // Mở lại nộp bù: hàng đang chỉnh hạn, và hàng đang huỷ (khoá nút cho khỏi bấm chồng).
  const [reopening, setReopening] = useState<SubmissionRow | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  useEffect(() => {
    if (submissions.errors.length) handleActionErrors(submissions.errors);
  }, [submissions.errors]);

  // Chỉ chấm được bài đã nộp. Bài CHƯA chấm lên trước để admin chấm lần lượt không
  // phải tự dò.
  const gradable = useMemo(
    () =>
      rows
        .filter((r) => r.status !== 'NOT_SUBMITTED')
        .sort((a, b) => Number(a.status === 'GRADED') - Number(b.status === 'GRADED')),
    [rows],
  );

  // Lọc phía client trên danh sách đã tải sẵn — nhanh, không cần gọi lại BE.
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (statusFilter !== ALL_VALUE && r.status !== statusFilter) return false;
      if (!q) return true;
      return (r.fullName ?? '').toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
    });
    if (!scoreSort.value) return filtered;
    const dir = scoreSort.order === 'asc' ? 1 : -1;
    // Bài chưa có điểm luôn nằm cuối, dù sắp xếp chiều nào.
    return filtered.sort((a, b) =>
      a.score === null || b.score === null
        ? Number(a.score === null) - Number(b.score === null)
        : (a.score - b.score) * dir,
    );
  }, [rows, search, statusFilter, scoreSort]);

  const currentRow = useMemo(() => {
    if (!queue) return null;
    const id = queue.ids[queue.pos];
    return rows.find((r) => r.studentId === id) ?? null;
  }, [queue, rows]);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      const res = await listSubmissions(test.id);
      if (res.errors.length) {
        if (!opts?.silent) handleActionErrors(res.errors);
        return;
      }
      setRows(res.data);
      setStats(res.stats);
    },
    [test.id],
  );

  // Email báo điểm đang chờ / đang gửi: tự tải lại ngay sau mốc gửi để cột trạng thái tự
  // chuyển sang "Đã gửi" mà admin không phải F5. Không có email nào đang chờ thì không hẹn.
  useEffect(() => {
    const now = Date.now();
    const next = rows.reduce<number | null>((soonest, r) => {
      const s = r.scoreEmail;
      let at: number | null = null;
      if (s?.state === 'SCHEDULED' && s.at) at = new Date(s.at).getTime() + 15_000;
      else if (s?.state === 'PENDING') at = now + 10_000;
      return at !== null && (soonest === null || at < soonest) ? at : soonest;
    }, null);
    if (next === null) return;
    // Quá mốc mà vẫn chưa gửi (BE đang bận / tạm tắt) thì thưa ra, không dội request.
    const delay = next > now ? Math.min(next - now, 10 * 60_000) : 30_000;
    const id = window.setTimeout(() => void refresh({ silent: true }), delay);
    return () => window.clearTimeout(id);
  }, [rows, refresh]);

  const scoreEmailEnabled = test.type === 'EXAM' && !!test.emailNotify;

  // Mở lại là quyền ADMIN (BE trả 403 cho trợ giảng), và chỉ có nghĩa khi bài đã mở.
  const canReopen = !isTA && test.phase !== 'SCHEDULED';

  const cancelReopen = useCallback(
    async (studentId: number) => {
      setCancelingId(studentId);
      try {
        const res = await cancelReopenSubmissionAction(courseId, test.id, studentId);
        const ok = handleActionResult(res.errors, undefined, 'Đã huỷ mở lại bài');
        if (ok) await refresh();
      } finally {
        setCancelingId(null);
      }
    },
    [courseId, test.id, refresh],
  );

  // Bài đã nộp nhưng chưa chấm — dùng để tô điểm thẻ số + gợi ý "chấm tiếp" và làm nổi
  // bật hàng cần xử lý trong bảng, thay vì bắt admin tự dò cột trạng thái.
  const pendingGradeCount = Math.max(stats.submittedCount - stats.gradedCount, 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          title="Đã nộp / Tham gia"
          value={`${stats.submittedCount} / ${stats.participantCount}`}
          icon={Users}
          accent="purple"
        />
        <StatCard
          title="Đã chấm / Đã nộp"
          value={`${stats.gradedCount} / ${stats.submittedCount}`}
          icon={ClipboardCheck}
          accent={pendingGradeCount > 0 ? 'amber' : 'green'}
        />
        <StatCard
          title="Điểm trung bình"
          value={stats.avg === null ? '—' : String(stats.avg)}
          suffix={stats.avg === null ? undefined : `/ ${test.maxScore}`}
          icon={Target}
          accent="neutral"
        />
        <StatCard
          title="Điểm cao nhất"
          value={stats.max === null ? '—' : String(stats.max)}
          suffix={stats.max === null ? undefined : `/ ${test.maxScore}`}
          icon={ArrowUp}
          accent="neutral"
        />
        <StatCard
          title="Điểm thấp nhất"
          value={stats.min === null ? '—' : String(stats.min)}
          suffix={stats.min === null ? undefined : `/ ${test.maxScore}`}
          icon={ArrowDown}
          accent="neutral"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Phổ điểm</CardTitle>
        </CardHeader>
        <CardContent className="pb-4 sm:pb-6">
          <ScoreDistributionChart
            distribution={stats.distribution}
            maxScore={test.maxScore}
            avgScore={stats.avg}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Bài nộp</CardTitle>
            {pendingGradeCount > 0 && (
              <Button
                size="sm"
                className="cursor-pointer"
                onClick={() => setQueue({ ids: gradable.map((g) => g.studentId), pos: 0 })}
              >
                <Sparkles /> Chấm bài tiếp theo ({pendingGradeCount})
              </Button>
            )}
          </div>
          <TableSearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo họ tên hoặc email…"
            aria-label="Tìm theo họ tên hoặc email"
          />
        </CardHeader>
        <CardContent className="pb-4 sm:pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Họ tên</TableHead>
                <TableHead>Email</TableHead>
                <ColumnFilterHead
                  label="Trạng thái"
                  value={statusFilter}
                  options={SUBMISSION_STATUS_OPTIONS}
                  onChange={setStatusFilter}
                />
                <TableHead>Nộp lúc</TableHead>
                <ColumnSortHead
                  label="Điểm"
                  value={scoreSort.value}
                  order={scoreSort.order}
                  options={SCORE_SORT_OPTIONS}
                  onChange={(value, order) => setScoreSort({ value, order })}
                  className="text-center"
                />
                <TableHead className="text-right">Hành động</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center text-sm">
                    {rows.length === 0 ? 'Chưa có học sinh nào' : 'Không có kết quả phù hợp'}
                  </TableCell>
                </TableRow>
              )}
              {filteredRows.map((r) => {
                const needsGrade = r.status === 'SUBMITTED';
                return (
                  <TableRow
                    key={r.studentId}
                    className={cn(
                      'hover:bg-muted/40 border-l-2 border-l-transparent transition-colors',
                      // Bài đã nộp chờ chấm là việc admin cần làm — kẻ viền trái để mắt
                      // rơi ngay vào hàng đó thay vì lướt hết cột trạng thái.
                      needsGrade && 'border-l-yellow-400 bg-yellow-50/60',
                    )}
                  >
                    <TableCell className="font-medium">
                      {r.fullName ?? '—'}
                      {r.leftCourse && (
                        <Badge variant="outline" className="ml-2">
                          Đã rời khóa
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={STATUS[r.status].variant}>{STATUS[r.status].text}</Badge>
                        {r.reopen && (
                          <span className="text-xs text-emerald-700">
                            Mở đến {formatDateTime(r.reopen.reopenUntil)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDateTime(r.submittedAt)}
                      {/* Chỉ suy ra "đã sửa" khi bài CHƯA chấm: updatedAt của bài nộp bị
                        chạm mỗi lần ghi, kể cả lúc admin chấm điểm — bài đã chấm thì
                        updatedAt là thời điểm chấm, so với submittedAt sẽ luôn lệch và
                        báo "đã sửa" cho một học sinh không hề sửa gì. */}
                      {r.status === 'SUBMITTED' &&
                        r.submittedAt &&
                        r.updatedAt &&
                        r.updatedAt !== r.submittedAt && (
                          <span className="ml-1 text-xs">(đã sửa)</span>
                        )}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.score === null ? (
                        <span className="text-muted-foreground">Chưa chấm</span>
                      ) : (
                        <strong>
                          {r.score}/{test.maxScore}
                        </strong>
                      )}
                      {r.scoreEmail && (
                        <ScoreEmailLine status={r.scoreEmail} className="mt-1 justify-center" />
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canReopen && !r.leftCourse && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() => setReopening(r)}
                            >
                              <CalendarClock />
                              {r.reopen ? 'Sửa hạn' : 'Mở lại'}
                            </Button>
                            {r.reopen && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive cursor-pointer"
                                disabled={cancelingId === r.studentId}
                                onClick={() => cancelReopen(r.studentId)}
                              >
                                Huỷ
                              </Button>
                            )}
                          </>
                        )}
                        {/* Mở lại + Chấm bài cùng nằm ở cột Hành động, xếp dọc cho gọn. */}
                        {r.status !== 'NOT_SUBMITTED' && (
                          <Button
                            size="sm"
                            // Bài chờ chấm dùng nút primary để nổi bật việc cần làm; bài đã
                            // chấm rồi chỉ là xem lại nên giữ outline cho nhẹ mắt.
                            variant={needsGrade ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() =>
                              setQueue({
                                ids: gradable.map((g) => g.studentId),
                                pos: gradable.findIndex((g) => g.studentId === r.studentId),
                              })
                            }
                          >
                            <ClipboardCheck />
                            {r.status === 'GRADED' ? 'Xem lại' : 'Chấm bài'}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {queue && currentRow && (
        <GradingDialog
          key={currentRow.studentId}
          courseId={courseId}
          testId={test.id}
          maxScore={test.maxScore}
          isExam={test.type === 'EXAM'}
          scoreEmailEnabled={scoreEmailEnabled}
          row={currentRow}
          index={queue.pos}
          total={queue.ids.length}
          gradedCount={stats.gradedCount}
          submittedCount={stats.submittedCount}
          onClose={() => setQueue(null)}
          onNavigate={(pos) => setQueue((q) => (q ? { ...q, pos } : q))}
          onGraded={refresh}
        />
      )}

      {reopening && (
        <ReopenSubmissionDialog
          key={reopening.studentId}
          open
          onOpenChange={(o) => !o && setReopening(null)}
          courseId={courseId}
          testId={test.id}
          maxScore={test.maxScore}
          row={reopening}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

const STAT_ACCENT: Record<'purple' | 'amber' | 'green' | 'neutral', string> = {
  purple: 'bg-purple/10 text-purple',
  amber: 'bg-yellow-100 text-yellow-700',
  green: 'bg-green-100 text-green-700',
  neutral: 'bg-muted text-muted-foreground',
};

function StatCard({
  title,
  value,
  suffix,
  icon: Icon,
  accent,
}: {
  title: string;
  value: string;
  suffix?: string;
  icon: LucideIcon;
  accent: keyof typeof STAT_ACCENT;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 py-4 sm:py-6">
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {title}
          </p>
          <p className="mt-1.5 truncate text-2xl font-bold tabular-nums">
            {value}
            {suffix && (
              <span className="text-muted-foreground ml-1 text-base font-medium">{suffix}</span>
            )}
          </p>
        </div>
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-full',
            STAT_ACCENT[accent],
          )}
        >
          <Icon className="size-4.5" />
        </span>
      </CardContent>
    </Card>
  );
}

/** Trạng thái email báo điểm của một học sinh — dòng nhỏ dưới điểm / trong hộp chấm bài. */
function ScoreEmailLine({ status, className }: { status: ScoreEmailStatus; className?: string }) {
  const at = status.at;
  const view = {
    SCHEDULED: {
      icon: Clock,
      tone: 'text-amber-700',
      text: `${status.isUpdate ? 'Email cập nhật điểm' : 'Email báo điểm'} gửi lúc ${at ? formatTime(at) : '—'}`,
    },
    PENDING: { icon: Mail, tone: 'text-muted-foreground', text: 'Đang gửi email báo điểm…' },
    SENT: {
      icon: MailCheck,
      tone: 'text-emerald-700',
      text: `Đã gửi email${at ? ` ${formatDateTimeShort(at)}` : ''}`,
    },
    FAILED: { icon: MailX, tone: 'text-destructive', text: 'Gửi email lỗi' },
  }[status.state];
  const Icon = view.icon;
  return (
    <span
      className={cn('flex items-center gap-1 text-xs', view.tone, className)}
      title={
        status.state === 'FAILED'
          ? `${status.error ?? 'Gửi email thất bại'} — gửi lại ở mục Email tự động`
          : undefined
      }
    >
      <Icon className="size-3.5 shrink-0" />
      {view.text}
    </span>
  );
}

function GradingDialog({
  courseId,
  testId,
  maxScore,
  isExam,
  scoreEmailEnabled,
  row,
  index,
  total,
  gradedCount,
  submittedCount,
  onClose,
  onNavigate,
  onGraded,
}: {
  courseId: number;
  testId: number;
  maxScore: number;
  isExam: boolean;
  /** Bài kiểm tra bật email báo điểm. */
  scoreEmailEnabled: boolean;
  row: SubmissionRow;
  index: number;
  total: number;
  gradedCount: number;
  submittedCount: number;
  onClose: () => void;
  onNavigate: (i: number) => void;
  onGraded: () => Promise<void>;
}) {
  const [score, setScore] = useState(row.score === null ? '' : String(row.score));
  const [feedback, setFeedback] = useState(row.feedback ?? '');
  const [saving, setSaving] = useState(false);
  // setSaving chỉ có hiệu lực ở lần render sau, nên hai cú click liên tiếp cùng lọt qua
  // `saving === false`. Ref khoá ngay trong lần click đầu.
  const savingRef = useRef(false);

  async function save() {
    if (savingRef.current) return;

    const value = Number(score);
    if (!score.trim() || !Number.isFinite(value)) {
      return handleActionErrors(['Chưa nhập điểm']);
    }
    if (value < 0 || value > maxScore) {
      return handleActionErrors([`Điểm phải trong khoảng 0 – ${maxScore}`]);
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const res = await gradeSubmissionAction(courseId, testId, row.studentId, {
        score: value,
        feedback: feedback.trim() || undefined,
      });
      if (res.errors.length) return handleActionErrors(res.errors);

      handleActionSuccess(
        res.scoreEmailAt
          ? `Đã chấm điểm — email báo điểm sẽ gửi lúc ${formatTime(res.scoreEmailAt)}`
          : 'Đã chấm điểm',
      );
      // Phải chờ tải lại xong rồi mới sang bài kế: chuyển sớm thì dialog mở ra trên dữ
      // liệu cũ và điểm vừa nhập vẫn còn nằm trong ô.
      await onGraded();
      // Sang bài kế tiếp để chấm liên tục, hết thì đóng.
      if (index + 1 < total) onNavigate(index + 1);
      else onClose();
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent size="full" className={GRADING_MODAL_SIZE} aria-describedby={undefined}>
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="border-divider shrink-0 border-b px-4 py-3">
            <div className="flex items-center justify-between gap-3 pr-8">
              <div className="min-w-0">
                <DialogTitle className="flex items-center gap-2">
                  <span className="truncate">{row.fullName ?? row.email}</span>
                  <Badge variant={STATUS[row.status].variant} className="shrink-0">
                    {STATUS[row.status].text}
                  </Badge>
                </DialogTitle>
                {row.fullName && (
                  <p className="text-muted-foreground truncate text-sm">{row.email}</p>
                )}
                {row.submittedAt && (
                  <p className="text-muted-foreground truncate text-sm">
                    Nộp lúc {formatDateTime(row.submittedAt)}
                    {row.status === 'SUBMITTED' &&
                      row.updatedAt &&
                      row.updatedAt !== row.submittedAt && (
                        <span className="ml-1 text-xs">(đã sửa)</span>
                      )}
                  </p>
                )}
              </div>
              <span className="text-muted-foreground shrink-0 text-sm tabular-nums">
                Đã chấm {gradedCount}/{submittedCount}
              </span>
            </div>
          </DialogHeader>

          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 lg:grid-cols-[1fr_320px] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
            <div className="min-w-0 lg:-m-1 lg:h-full lg:min-h-0 lg:overflow-y-auto lg:p-1">
              <TestAttachmentViewer
                files={row.files}
                emptyHint="Học sinh không nộp tệp nào"
                variant="slider"
                rotatable
              />
            </div>

            <div className="space-y-4 lg:-m-1 lg:max-h-full lg:self-start lg:overflow-y-auto lg:p-1">
              {row.note && (
                <div className="bg-muted max-h-32 overflow-y-auto rounded-lg p-3 text-sm">
                  <p className="text-muted-foreground mb-1 text-xs font-medium">
                    Ghi chú của học sinh
                  </p>
                  {row.note}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="grade-score">Điểm (0 – {maxScore})</Label>
                <Input
                  id="grade-score"
                  type="number"
                  step="0.01"
                  min="0"
                  max={maxScore}
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade-feedback">Nhận xét</Label>
                <Textarea
                  id="grade-feedback"
                  rows={6}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  disabled={saving}
                  placeholder="Trình bày tốt, sai câu 3…"
                />
              </div>

              <Button
                onClick={() => void save()}
                disabled={saving}
                className="w-full cursor-pointer"
              >
                {saving ? 'Đang lưu…' : 'Lưu điểm'}
              </Button>

              {scoreEmailEnabled ? (
                <div className="text-muted-foreground flex gap-2 rounded-md border border-dashed p-2.5 text-xs">
                  <Mail className="mt-0.5 size-3.5 shrink-0" />
                  <div className="min-w-0 space-y-1.5">
                    <p>
                      Email báo điểm tự gửi cho học sinh {SCORE_EMAIL_DELAY_MINUTES} phút sau lần
                      lưu điểm cuối cùng. Sửa điểm trước lúc đó thì học sinh chỉ nhận điểm mới; sửa
                      sau khi đã gửi thì học sinh nhận thêm email cập nhật điểm.
                    </p>
                    {row.scoreEmail && <ScoreEmailLine status={row.scoreEmail} />}
                  </div>
                </div>
              ) : (
                isExam && (
                  <p className="text-muted-foreground text-xs">
                    Bài kiểm tra này đang tắt email báo điểm — bật ở nút <strong>Sửa</strong> của
                    bài.
                  </p>
                )
              )}

              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={index === 0 || saving}
                  onClick={() => onNavigate(index - 1)}
                  className="cursor-pointer"
                >
                  <ChevronLeft /> Bài trước
                </Button>
                <span className="text-muted-foreground text-xs">
                  {index + 1} / {total}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={index + 1 >= total || saving}
                  onClick={() => onNavigate(index + 1)}
                  className="cursor-pointer"
                >
                  Bài tiếp <ChevronRight />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
