'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, Pencil, Plus, Trash2 } from 'lucide-react';
import { deleteTestAction } from '@/actions/v1/tests/delete-test';
import { listTests } from '@/actions/v1/tests/list-tests';
import EmptyState from '@/components/app/EmptyState';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useIsTeachingAssistant } from '@/components/app/RoleProvider';
import { Progress } from '@/components/ui/progress';
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
import { TEST_TYPE_LABEL, type AdminTestRow, type TestPhase, type TestType } from '@/types/tests';
import TestFormModal from './TestFormModal';

interface Props {
  courseId: number;
}

const PHASE_LABEL: Record<
  TestPhase,
  { text: string; variant: 'secondary' | 'default' | 'outline' }
> = {
  SCHEDULED: { text: 'Sắp diễn ra', variant: 'outline' },
  ONGOING: { text: 'Đang mở', variant: 'default' },
  ENDED: { text: 'Đã kết thúc', variant: 'secondary' },
};

function formatRange(start: string, end: string): string {
  return `${formatDateTime(start)} → ${formatDateTime(end)}`;
}

/**
 * Section "Bài kiểm tra" nằm dưới cây nội dung trong tab Nội dung.
 *
 * Tự nạp dữ liệu (client) thay vì nhận qua props: giữ CourseStructureTab — file 850
 * dòng và đang có PR khác sửa — chỉ phải thêm đúng một dòng.
 */
export default function CourseTestsSection({ courseId }: Props) {
  const router = useRouter();
  const isTA = useIsTeachingAssistant();
  const [tests, setTests] = useState<AdminTestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [createType, setCreateType] = useState<TestType>('HOMEWORK');
  const [deleteTarget, setDeleteTarget] = useState<AdminTestRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const res = await listTests<AdminTestRow>(courseId);
    if (res.errors.length) handleActionErrors(res.errors);
    setTests(res.data);
    setLoading(false);
  }, [courseId]);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Nạp danh sách lúc mount. Section này cố tình tự lấy dữ liệu để CourseStructureTab
  // (850 dòng, đang có PR khác sửa) chỉ phải thêm một dòng.
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await deleteTestAction(courseId, deleteTarget.id);
      handleActionResult(
        res.errors,
        () => {
          setDeleteTarget(null);
          void load();
        },
        'Đã xoá bài kiểm tra',
      );
    } finally {
      setDeleting(false);
    }
  }

  function openCreate(type: TestType) {
    setEditingId(undefined);
    setCreateType(type);
    setFormOpen(true);
  }

  const createButtons = (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => openCreate('HOMEWORK')} className="cursor-pointer">
        <Plus /> Tạo bài tập
      </Button>
      <Button onClick={() => openCreate('EXAM')} className="cursor-pointer">
        <Plus /> Tạo bài kiểm tra
      </Button>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Bài tập & bài kiểm tra</CardTitle>
          <p className="text-muted-foreground mt-1 text-sm">
            Ra đề bằng ảnh/PDF, đặt lịch làm bài. Hết giờ là khoá nộp. Bài tập chỉ cần nộp, bài kiểm
            tra có chấm điểm.
          </p>
        </div>
        {!isTA && createButtons}
      </CardHeader>

      <CardContent className="pb-4 sm:pb-6">
        {loading ? (
          <div className="space-y-2" role="status" aria-label="Đang tải danh sách bài kiểm tra">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        ) : tests.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="Chưa có bài tập hay bài kiểm tra"
            description={
              isTA
                ? 'Khoá học này hiện chưa có bài tập hay bài kiểm tra nào.'
                : 'Tạo bài tập hoặc bài kiểm tra để học sinh làm bài trong khoảng thời gian bạn đặt.'
            }
            action={isTA ? undefined : createButtons}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên</TableHead>
                <TableHead>Thời gian</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-center">Đã nộp / Tham gia</TableHead>
                <TableHead className="text-center">Điểm tối đa</TableHead>
                {!isTA && <TableHead className="text-right">Hành động</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((t) => {
                const phase = PHASE_LABEL[t.phase];
                return (
                  <TableRow
                    key={t.id}
                    onClick={() => router.push(`/admin/courses/${courseId}/tests/${t.id}`)}
                    className="group hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <TableCell className="font-medium">
                      {/* Link thật trên tiêu đề để bàn phím / mở tab mới vẫn dùng được;
                          bấm chỗ khác trên hàng chỉ là lối tắt cho chuột. stopPropagation
                          để không điều hướng hai lần. */}
                      <Link
                        href={`/admin/courses/${courseId}/tests/${t.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="group-hover:text-purple focus-visible:ring-purple/40 rounded-sm outline-none hover:underline focus-visible:ring-2"
                      >
                        {t.title}
                      </Link>
                      <Badge
                        variant={t.type === 'HOMEWORK' ? 'secondary' : 'outline'}
                        className="ml-2 align-middle"
                      >
                        {TEST_TYPE_LABEL[t.type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatRange(t.startTime, t.endTime)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={phase.variant}>{phase.text}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="mx-auto w-24 space-y-1">
                        <span className="block text-xs tabular-nums">
                          {t.submissionCount} / {t.participantCount}
                        </span>
                        <Progress
                          value={
                            t.participantCount > 0
                              ? (t.submissionCount / t.participantCount) * 100
                              : 0
                          }
                          className="h-1.5"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {t.type === 'HOMEWORK' ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        t.maxScore
                      )}
                    </TableCell>
                    {!isTA && (
                      <TableCell>
                        {/* Nút thao tác không được kích hoạt điều hướng của cả hàng. */}
                        <div
                          className="flex justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                            className="size-8 cursor-pointer"
                            aria-label={`Sửa ${t.title}`}
                            onClick={() => {
                              setEditingId(t.id);
                              setFormOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive size-8 cursor-pointer"
                            aria-label={`Xoá ${t.title}`}
                            onClick={() => setDeleteTarget(t)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <TestFormModal
        key={editingId ?? `new-${createType}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        courseId={courseId}
        testId={editingId}
        initialType={createType}
        onSaved={load}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá bài kiểm tra?</AlertDialogTitle>
            <AlertDialogDescription>
              Xoá <span className="text-foreground font-medium">{deleteTarget?.title}</span> sẽ xoá
              luôn đề bài và <strong>toàn bộ bài nộp đã chấm</strong> của học sinh. Không khôi phục
              được.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="cursor-pointer">
              Huỷ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 cursor-pointer"
            >
              {deleting ? 'Đang xoá…' : 'Xoá'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
