'use client';

import { useMemo, useState } from 'react';
import { CalendarX2, CheckCircle2, ClipboardX, MoreHorizontal, X } from 'lucide-react';
import DataPagination from '@/components/app/DataPagination';
import { useIsTeachingAssistant } from '@/components/app/RoleProvider';
import ColumnFilterHead, {
  type ColumnFilterOption,
} from '@/components/app/table-filters/ColumnFilterHead';
import {
  STICKY_ACTION_CELL,
  STICKY_ACTION_HEAD,
  STICKY_L0_CELL,
  STICKY_L0_HEAD,
  STICKY_L10_CELL,
  STICKY_L10_HEAD,
  STICKY_ROW,
} from '@/components/app/table-filters/sticky';
import { cn } from '@/lib/utils';
import TableSearchInput from '@/components/app/table-filters/TableSearchInput';
import { ALL_VALUE, PAGE_SIZE_OPTIONS } from '@/lib/constants';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
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
import ManualAttendanceDialog, {
  type ManualDialogMode,
} from '@/components/features/class-sessions/ManualAttendanceDialog';
import { manualAttendanceAction } from '@/actions/v1/attendance/manual-attendance';
import { handleActionResult } from '@/lib/actions';
import { formatDateTimeShort } from '@/lib/format';
import { Textarea } from '@/components/ui/textarea';
import type { AttendanceSummary, AttendanceSummaryStudent } from '@/types/actions/attendance';
import type { ManualEditAction } from '@/types/class-management';

function formatHm(iso: string): string {
  return new Date(iso).toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const PLACEHOLDER_STUDENT: AttendanceSummaryStudent = {
  studentId: 0,
  fullName: null,
  email: '',
  leaveRequest: null,
  attendances: [],
};

type AttendanceStatus = 'ATTENDED' | 'ON_LEAVE' | 'NOT_ATTENDED';

// Thứ tự ưu tiên có mặt > xin nghỉ > vắng khớp resolveAttendanceStatus của BE,
// nên cột này không lệch với thẻ "Báo cáo tổng quan" ngay phía trên và với file
// Excel xuất ra.
const ATTENDANCE_STATUS_META: Record<
  AttendanceStatus,
  { label: string; variant: 'success' | 'warning' | 'destructive' }
> = {
  ATTENDED: { label: 'Đã điểm danh', variant: 'success' },
  ON_LEAVE: { label: 'Xin nghỉ', variant: 'warning' },
  NOT_ATTENDED: { label: 'Chưa điểm danh', variant: 'destructive' },
};

const ATTENDANCE_STATUS_OPTIONS: ColumnFilterOption[] = (
  Object.keys(ATTENDANCE_STATUS_META) as AttendanceStatus[]
).map((value) => ({ value, label: ATTENDANCE_STATUS_META[value].label }));

interface Props {
  classSessionId: number;
  summary: AttendanceSummary | null;
  onChanged: () => void;
}

interface DialogState {
  mode: ManualDialogMode;
  student: AttendanceSummaryStudent;
}

type BulkMode = 'mark' | 'remove' | 'excuse';

const BULK_MODE_META: Record<
  BulkMode,
  { title: string; action: ManualEditAction; success: string; requiresSession: boolean }
> = {
  mark: {
    title: 'Đánh dấu có mặt hàng loạt',
    action: 'MARK_ATTENDED',
    success: 'Đã đánh dấu có mặt',
    requiresSession: true,
  },
  remove: {
    title: 'Huỷ điểm danh hàng loạt',
    action: 'REMOVE_ATTENDANCE',
    success: 'Đã huỷ điểm danh',
    requiresSession: true,
  },
  // Nghỉ có phép không cần phiên điểm danh — học sinh báo nghỉ trước buổi vẫn ghi được.
  excuse: {
    title: 'Đánh dấu nghỉ có phép',
    action: 'MARK_EXCUSED',
    success: 'Đã đánh dấu nghỉ có phép cho',
    requiresSession: false,
  },
};

interface BulkDialogState {
  mode: BulkMode;
  students: AttendanceSummaryStudent[];
}

export default function AttendanceSummaryTable({ classSessionId, summary, onChanged }: Props) {
  const isTA = useIsTeachingAssistant();
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [bulkDialog, setBulkDialog] = useState<BulkDialogState | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  // Lọc client-side: dữ liệu đã tải trọn buổi học nên gõ là lọc ngay, không cần debounce.
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(ALL_VALUE);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);

  const sessions = summary?.attendanceSessions ?? [];

  const studentRows = useMemo(() => {
    const students = summary?.students ?? [];
    return students.map((s) => {
      const logsBySession = new Map<number, AttendanceSummaryStudent['attendances'][number]>();
      for (const log of s.attendances) {
        logsBySession.set(log.attendanceSessionId, log);
      }
      const status: AttendanceStatus =
        s.attendances.length > 0 ? 'ATTENDED' : s.leaveRequest ? 'ON_LEAVE' : 'NOT_ATTENDED';
      return { ...s, logsBySession, status };
    });
  }, [summary]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return studentRows.filter((r) => {
      const matchQ =
        !q || (r.fullName ?? '').toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
      const matchStatus = statusFilter === ALL_VALUE || r.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [studentRows, search, statusFilter]);

  const handleSearchChange = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const handleStatusFilterChange = (v: string) => {
    setStatusFilter(v);
    setPage(1);
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize],
  );

  const allFilteredIds = useMemo(() => filteredRows.map((r) => r.studentId), [filteredRows]);

  const allSelected =
    allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.has(id));
  const someSelected = allFilteredIds.some((id) => selectedIds.has(id));

  const selectedStudents = useMemo(
    () => studentRows.filter((r) => selectedIds.has(r.studentId)),
    [studentRows, selectedIds],
  );

  function toggleAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function toggleOne(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  if (!summary) {
    return (
      <div className="text-muted-foreground border-divider rounded-md border border-dashed p-6 text-center text-sm">
        Không có dữ liệu điểm danh
      </div>
    );
  }

  const colCount = 5 + sessions.length * 2 + 1;

  return (
    <>
      {/* Tìm gộp tên + email, gõ là lọc — thay cho 2 ô riêng + nút Tìm kiếm. */}
      <TableSearchInput
        value={search}
        onChange={handleSearchChange}
        placeholder="Tìm theo họ tên hoặc email…"
      />

      {/* Bulk action bar — điểm danh thủ công, Trợ giảng không có quyền */}
      {!isTA && (
        <div className="bg-muted/50 border-divider flex flex-wrap items-start gap-3 rounded-lg border p-3">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <span className="text-foreground shrink-0 text-sm font-medium">
              {selectedStudents.length > 0
                ? `Đã chọn ${selectedStudents.length} học sinh:`
                : 'Chưa chọn học sinh nào'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {selectedStudents.map((s) => (
                <Badge
                  key={s.studentId}
                  variant="secondary"
                  className="cursor-pointer gap-1 pr-1"
                  onClick={() => toggleOne(s.studentId)}
                >
                  {s.fullName ?? s.email}
                  <X className="size-3" />
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="default"
              disabled={selectedStudents.length === 0}
              onClick={() => setBulkDialog({ mode: 'mark', students: selectedStudents })}
            >
              <CheckCircle2 className="size-4" />
              Đánh dấu có mặt
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={selectedStudents.length === 0}
              onClick={() => setBulkDialog({ mode: 'remove', students: selectedStudents })}
            >
              <ClipboardX className="size-4" />
              Huỷ điểm danh
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={selectedStudents.length === 0}
              onClick={() => setBulkDialog({ mode: 'excuse', students: selectedStudents })}
            >
              <CalendarX2 className="size-4" />
              Nghỉ có phép
            </Button>
            {selectedStudents.length > 0 && (
              <Button size="sm" variant="ghost" onClick={clearSelection}>
                Bỏ chọn
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="border-divider rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {!isTA && (
                <TableHead className={`w-10 text-center ${STICKY_L0_HEAD}`}>
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    aria-label="Chọn tất cả"
                  />
                </TableHead>
              )}
              <TableHead
                className={cn(
                  'w-52 min-w-52',
                  // Không có cột checkbox (Trợ giảng) thì cột này là cột ghim trái ĐẦU
                  // TIÊN — phải ghim ở left-0, không thì để hở 40px lẽ ra checkbox chiếm.
                  isTA ? STICKY_L0_HEAD : STICKY_L10_HEAD,
                  'shadow-[8px_0_8px_-8px_rgba(0,0,0,0.15)]',
                )}
              >
                Họ tên học sinh
              </TableHead>
              <ColumnFilterHead
                label="Trạng thái"
                className="w-33 min-w-33 text-center"
                value={statusFilter}
                options={ATTENDANCE_STATUS_OPTIONS}
                onChange={handleStatusFilterChange}
              />
              <TableHead className="min-w-45">Lý do nghỉ</TableHead>
              {sessions.map((s, idx) => (
                <SessionColumnHead key={s.id} idx={idx} />
              ))}
              {!isTA && (
                <TableHead className={`w-16 text-center ${STICKY_ACTION_HEAD}`}>
                  Hành động
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={colCount} className="text-muted-foreground text-center">
                  {studentRows.length === 0
                    ? 'Chưa có học sinh trong lớp'
                    : 'Không tìm thấy học sinh phù hợp'}
                </TableCell>
              </TableRow>
            ) : (
              pagedRows.map((row) => (
                <TableRow
                  key={row.studentId}
                  data-state={selectedIds.has(row.studentId) ? 'selected' : undefined}
                  className={isTA ? STICKY_ROW : `cursor-pointer ${STICKY_ROW}`}
                  onClick={isTA ? undefined : () => toggleOne(row.studentId)}
                >
                  {!isTA && (
                    <TableCell
                      className={`text-center ${STICKY_L0_CELL}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedIds.has(row.studentId)}
                        onCheckedChange={() => toggleOne(row.studentId)}
                        aria-label={`Chọn ${row.fullName ?? row.email}`}
                      />
                    </TableCell>
                  )}
                  <TableCell
                    className={cn(
                      'text-foreground max-w-52 truncate font-medium',
                      isTA ? STICKY_L0_CELL : STICKY_L10_CELL,
                      'shadow-[8px_0_8px_-8px_rgba(0,0,0,0.15)]',
                    )}
                  >
                    {row.fullName ?? row.email}
                    {row.fullName && (
                      <div className="text-muted-foreground text-xs">{row.email}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-col items-center gap-0.5">
                      <Badge variant={ATTENDANCE_STATUS_META[row.status].variant}>
                        {ATTENDANCE_STATUS_META[row.status].label}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {row.leaveRequest ? (
                      <span className="text-foreground text-sm">{row.leaveRequest.reason}</span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  {sessions.map((s) => {
                    const log = row.logsBySession.get(s.id);
                    return <SessionColumnCells key={s.id} log={log} />;
                  })}
                  {!isTA && (
                    <TableCell onClick={(e) => e.stopPropagation()} className={STICKY_ACTION_CELL}>
                      <div className="flex items-center justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="cursor-pointer"
                              title="Hành động"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => setDialog({ mode: 'mark', student: row })}
                            >
                              Đánh dấu có mặt
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => setDialog({ mode: 'remove', student: row })}
                            >
                              Huỷ điểm danh
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => setDialog({ mode: 'note', student: row })}
                            >
                              Thêm ghi chú
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => setDialog({ mode: 'excuse', student: row })}
                            >
                              {row.leaveRequest
                                ? 'Sửa lý do nghỉ có phép'
                                : 'Đánh dấu nghỉ có phép'}
                            </DropdownMenuItem>
                            {row.leaveRequest && (
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => setDialog({ mode: 'unexcuse', student: row })}
                              >
                                Huỷ nghỉ có phép
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination footer */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <span>Hiển thị</span>
          <Select value={String(pageSize)} onValueChange={(v) => handlePageSizeChange(Number(v))}>
            <SelectTrigger className="w-20 cursor-pointer">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>/ {filteredRows.length} học sinh</span>
        </div>
        <DataPagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      <ManualAttendanceDialog
        open={!!dialog}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
        mode={dialog?.mode ?? 'mark'}
        classSessionId={classSessionId}
        student={dialog?.student ?? PLACEHOLDER_STUDENT}
        attendanceSessions={sessions}
        onSuccess={() => {
          setDialog(null);
          onChanged();
        }}
      />

      {bulkDialog && (
        <BulkAttendanceDialog
          open
          mode={bulkDialog.mode}
          classSessionId={classSessionId}
          students={bulkDialog.students}
          attendanceSessions={sessions}
          onOpenChange={(open) => {
            if (!open) setBulkDialog(null);
          }}
          onSuccess={() => {
            setBulkDialog(null);
            clearSelection();
            onChanged();
          }}
        />
      )}
    </>
  );
}

function SessionColumnHead({ idx }: { idx: number }) {
  return (
    <>
      <TableHead className="min-w-30 text-center">
        Phiên #{idx + 1}
        <div className="text-muted-foreground text-[10px] font-normal normal-case">
          Đã điểm danh
        </div>
      </TableHead>
      <TableHead className="min-w-25 text-center">
        Phiên #{idx + 1}
        <div className="text-muted-foreground text-[10px] font-normal normal-case">Thời gian</div>
      </TableHead>
    </>
  );
}

function SessionColumnCells({
  log,
}: {
  log: AttendanceSummaryStudent['attendances'][number] | undefined;
}) {
  return (
    <>
      <TableCell className="text-center">
        {log ? (
          <Badge variant={log.source === 'MANUAL' ? 'warning' : 'success'}>
            {log.source === 'MANUAL' ? 'Có (TC)' : 'Có'}
          </Badge>
        ) : (
          <Badge variant="outline">Không</Badge>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground text-center text-xs">
        {log ? formatHm(log.checkedAt) : '—'}
      </TableCell>
    </>
  );
}

interface BulkAttendanceDialogProps {
  open: boolean;
  mode: BulkMode;
  classSessionId: number;
  students: AttendanceSummaryStudent[];
  attendanceSessions: import('@/types/actions/attendance').AttendanceSessionListRow[];
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function BulkAttendanceDialog({
  open,
  mode,
  classSessionId,
  students,
  attendanceSessions,
  onOpenChange,
  onSuccess,
}: BulkAttendanceDialogProps) {
  const sortedSessions = useMemo(
    () =>
      [...attendanceSessions].sort(
        (a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
      ),
    [attendanceSessions],
  );

  const [sessionId, setSessionId] = useState<string>(
    sortedSessions[0] ? String(sortedSessions[0].id) : '',
  );
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const { title, action, success: successMsg, requiresSession } = BULK_MODE_META[mode];
  const noSession = requiresSession && sortedSessions.length === 0;
  const reasonMissing = mode === 'excuse' && !reason.trim();

  const handleSubmit = async () => {
    if (noSession || reasonMissing || (requiresSession && !sessionId)) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        students.map((s) =>
          manualAttendanceAction(classSessionId, {
            studentId: s.studentId,
            action,
            ...(requiresSession ? { attendanceSessionId: Number(sessionId) } : {}),
            ...(mode === 'excuse' ? { note: reason.trim() } : {}),
          }),
        ),
      );
      const errors = results.flatMap((r) => r.errors);
      handleActionResult(errors, onSuccess, `${successMsg} ${students.length} học sinh`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label className="mb-2 block text-sm">Học sinh được chọn ({students.length})</Label>
            <div className="flex flex-wrap gap-1.5">
              {students.map((s) => (
                <Badge key={s.studentId} variant="secondary">
                  {s.fullName ?? s.email}
                </Badge>
              ))}
            </div>
          </div>

          {requiresSession && (
            <div>
              <Label>Phiên điểm danh</Label>
              {noSession ? (
                <p className="text-sm text-red-500">
                  Chưa có phiên điểm danh nào. Vui lòng bật điểm danh trước.
                </p>
              ) : (
                <Select value={sessionId} onValueChange={setSessionId}>
                  <SelectTrigger className="cursor-pointer">
                    <SelectValue placeholder="Chọn phiên" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedSessions.map((s, idx) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        Phiên #{sortedSessions.length - idx} — {formatDateTimeShort(s.openedAt)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {mode === 'excuse' && (
            <div>
              <Label htmlFor="bulk-excuse-reason">
                Lý do nghỉ <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="bulk-excuse-reason"
                rows={3}
                maxLength={500}
                placeholder="VD: Tham gia hoạt động của trường"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <p className="text-muted-foreground mt-1 text-xs">
                Áp dụng cho tất cả học sinh đã chọn và được gửi kèm email kết quả điểm danh.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Huỷ
          </Button>
          <Button onClick={handleSubmit} disabled={loading || noSession || reasonMissing}>
            {loading ? 'Đang lưu...' : 'Xác nhận'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
