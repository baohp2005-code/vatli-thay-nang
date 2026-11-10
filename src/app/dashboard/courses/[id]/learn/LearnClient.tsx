'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  CircleDollarSign,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutList,
  Lock,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import NodeContentViewer from '@/components/features/courses/NodeContentViewer';
import CourseContentSidebar from '@/components/features/courses/CourseContentSidebar';
import StudentTestsPanel from '@/components/features/tests/StudentTestsPanel';
import {
  flattenTree,
  nextFile,
  prevFile,
  resolveActiveFile,
  type FlatFile,
} from '@/lib/course-navigation';
import { formatVnd } from '@/lib/format';
import type { CourseDetail, CourseNodeTree } from '@/types/course-management';

type LearnTab = 'content' | 'exams';

interface Props {
  course: CourseDetail;
  initialNodeId: number | null;
  initialTab: LearnTab;
  initialTestId: number | null;
}

function countFiles(nodes: CourseNodeTree[]): number {
  return nodes.reduce(
    (sum, n) => sum + (n.type === 'FILE' ? 1 : 0) + (n.children ? countFiles(n.children) : 0),
    0,
  );
}

export default function LearnClient({ course, initialNodeId, initialTab, initialTestId }: Props) {
  const router = useRouter();
  const isEnrolled = course.isEnrolled === true;
  const flat = useMemo(() => flattenTree(course, isEnrolled), [course, isEnrolled]);

  const initialActive = resolveActiveFile(flat, initialNodeId);
  const [activeNodeId, setActiveNodeId] = useState<number | null>(initialActive?.node.id ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [theater, setTheater] = useState(false);
  // Chuyển đổi cấp cao giữa cây nội dung và bài kiểm tra. Đồng bộ ?tab= trên URL để
  // reload / chia sẻ link giữ nguyên tab đang xem (mặc định 'content').
  const [tab, setTab] = useState<LearnTab>(initialTab);
  const [openTestId, setOpenTestId] = useState<number | null>(initialTestId);

  const active = resolveActiveFile(flat, activeNodeId);
  const prev = active ? prevFile(flat, active.node.id) : null;
  const next = active ? nextFile(flat, active.node.id) : null;

  // Ghi cả tab + item + test vào URL để đổi cái này không xoá cái kia.
  function syncUrl(nextTab: LearnTab, nextNodeId: number | null, nextTestId: number | null) {
    const params = new URLSearchParams();
    params.set('tab', nextTab);
    if (nextNodeId != null) params.set('item', String(nextNodeId));
    if (nextTab === 'exams' && nextTestId != null) params.set('test', String(nextTestId));
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  function changeTab(nextTab: LearnTab) {
    setTab(nextTab);
    syncUrl(nextTab, activeNodeId, openTestId);
  }

  function changeOpenTest(testId: number | null) {
    setOpenTestId(testId);
    syncUrl(tab, activeNodeId, testId);
  }

  function selectNode(nodeId: number) {
    setActiveNodeId(nodeId);
    setSheetOpen(false);
    syncUrl(tab, nodeId, openTestId);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
  }

  const sidebar = (
    <CourseContentSidebar
      course={course}
      activeNodeId={active?.node.id ?? null}
      isEnrolled={isEnrolled}
      onSelect={selectNode}
    />
  );

  return (
    <div className="space-y-4 pb-16 lg:pb-0">
      <div className="flex items-center justify-between gap-2">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground w-fit cursor-pointer pl-1"
        >
          <Link href="/dashboard/courses">
            <ArrowLeft /> Danh sách khóa học
          </Link>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="hidden cursor-pointer lg:inline-flex"
          onClick={() => setTheater((t) => !t)}
        >
          {theater ? <PanelRightOpen /> : <PanelRightClose />}
          {theater ? 'Hiện danh sách' : 'Xem rộng'}
        </Button>
      </div>

      {/* Segmented control: nội dung khóa học ↔ bài kiểm tra */}
      <div className="bg-muted inline-flex max-w-full overflow-x-auto rounded-lg p-1.5">
        <button
          type="button"
          onClick={() => changeTab('content')}
          className={cn(
            'flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md px-4 text-[0.95rem] font-medium whitespace-nowrap transition',
            tab === 'content' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground',
          )}
        >
          <LayoutList className="size-4.5" /> Nội dung khóa học
        </button>
        <button
          type="button"
          onClick={() => changeTab('exams')}
          className={cn(
            'flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-md px-4 text-[0.95rem] font-medium whitespace-nowrap transition',
            tab === 'exams' ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground',
          )}
        >
          <ClipboardList className="size-4.5" /> Bài tập & kiểm tra
        </button>
      </div>

      {tab === 'exams' ? (
        <div className="space-y-4">
          <h1 className="font-paytone text-foreground text-xl tracking-tight md:text-2xl">
            {course.title}
          </h1>
          {isEnrolled ? (
            <StudentTestsPanel
              courseId={course.id}
              openTestId={openTestId}
              onOpenTestChange={changeOpenTest}
            />
          ) : (
            <Card>
              <CardContent className="text-muted-foreground flex flex-col items-center gap-2 py-12 text-sm">
                <Lock className="size-8" />
                Bạn cần ghi danh khóa học để tham gia bài kiểm tra.
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <>
          <div
            className={cn(
              'grid grid-cols-1 gap-4',
              !theater && 'lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_340px]',
            )}
          >
            <div className="min-w-0 space-y-5">
              <div className="space-y-1">
                <h1 className="font-paytone text-foreground text-xl tracking-tight md:text-2xl">
                  {course.title}
                </h1>
                {active && (
                  <p className="text-muted-foreground flex flex-wrap items-center gap-x-1 gap-y-0.5 text-sm">
                    {active.pathTitles.map((p, i) => (
                      <span key={i} className="inline-flex items-center gap-1">
                        <span className="truncate">{p}</span>
                        <ChevronsRight className="text-muted-foreground/60 size-3 shrink-0" />
                      </span>
                    ))}
                    <span className="text-foreground font-medium">{active.node.title}</span>
                  </p>
                )}
              </div>

              <ContentArea active={active} />

              {active && (prev || next) && (
                <div className="flex items-stretch justify-between gap-2">
                  <NavButton dir="prev" target={prev} onSelect={selectNode} />
                  <NavButton dir="next" target={next} onSelect={selectNode} />
                </div>
              )}

              <CourseOverview course={course} />
            </div>

            {!theater && (
              <aside className="hidden lg:sticky lg:top-[72px] lg:block lg:h-[calc(100dvh-88px)] lg:overflow-hidden">
                {sidebar}
              </aside>
            )}
          </div>

          <div className="border-divider bg-background/95 fixed inset-x-0 bottom-0 z-30 flex items-center gap-2 border-t px-3 py-2 backdrop-blur lg:hidden">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 cursor-pointer"
              disabled={!prev}
              onClick={() => prev && selectNode(prev.node.id)}
            >
              <ChevronLeft /> Trước
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="cursor-pointer"
              onClick={() => setSheetOpen(true)}
            >
              <LayoutList /> Nội dung
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 cursor-pointer"
              disabled={!next}
              onClick={() => next && selectNode(next.node.id)}
            >
              Tiếp <ChevronRight />
            </Button>
          </div>
        </>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="flex h-full w-[88vw] max-w-sm flex-col p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Nội dung khóa học</SheetTitle>
          </SheetHeader>
          <CourseContentSidebar
            course={course}
            activeNodeId={active?.node.id ?? null}
            isEnrolled={isEnrolled}
            onSelect={selectNode}
            variant="sheet"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NavButton({
  dir,
  target,
  onSelect,
}: {
  dir: 'prev' | 'next';
  target: FlatFile | null;
  onSelect: (id: number) => void;
}) {
  const isPrev = dir === 'prev';
  return (
    <Button
      variant="outline"
      className={cn(
        'h-auto max-w-[48%] min-w-0 cursor-pointer py-2',
        isPrev ? 'justify-start pr-3' : 'justify-end pl-3',
      )}
      disabled={!target}
      onClick={() => target && onSelect(target.node.id)}
    >
      {isPrev && <ChevronLeft className="shrink-0" />}
      <span className={cn('flex min-w-0 flex-col', isPrev ? 'items-start' : 'items-end')}>
        <span className="text-muted-foreground text-[10px] leading-none">
          {isPrev ? 'Bài trước' : 'Bài tiếp'}
        </span>
        <span className="w-full truncate text-xs font-medium">{target?.node.title ?? '—'}</span>
      </span>
      {!isPrev && <ChevronRight className="shrink-0" />}
    </Button>
  );
}

function ContentArea({ active }: { active: FlatFile | null }) {
  if (!active) {
    return (
      <Card>
        <CardContent className="flex min-h-[40vh] flex-col items-center justify-center gap-2 py-12 text-center">
          <LayoutList className="text-muted-foreground size-10" />
          <p className="text-foreground text-sm font-medium">Khóa học chưa có nội dung</p>
          <p className="text-muted-foreground text-sm">
            Vui lòng quay lại sau khi giáo viên thêm bài học.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { node, accessible } = active;

  if (!accessible) {
    return (
      <div className="bg-muted flex min-h-[45vh] flex-col items-center justify-center gap-3 rounded-lg px-4 text-center">
        <Lock className="text-muted-foreground size-10" />
        <div>
          <p className="text-foreground text-sm font-medium">Nội dung bị khóa</p>
          <p className="text-muted-foreground text-sm">
            Bạn cần được ghi danh khóa học để xem bài này. Vui lòng liên hệ giáo viên.
          </p>
        </div>
      </div>
    );
  }

  return <NodeContentViewer node={node} />;
}

function CourseOverview({ course }: { course: CourseDetail }) {
  const fileCount = countFiles(course.nodes);
  return (
    <Card className="mt-2">
      <CardHeader>
        <CardTitle>Về khóa học này</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pb-4 sm:pb-6">
        <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-muted-foreground size-4" />
            <span className="text-muted-foreground">Giảng viên:</span>
            <span className="text-foreground font-medium">
              {course.instructor?.fullName ?? course.instructor?.email ?? '—'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CircleDollarSign className="text-muted-foreground size-4" />
            <span className="text-muted-foreground">Học phí:</span>
            <span className="text-primary font-semibold">{formatVnd(course.price)}</span>
          </div>
          <div className="flex items-center gap-2">
            <LayoutList className="text-muted-foreground size-4" />
            <span className="text-muted-foreground">Nội dung:</span>
            <span className="text-foreground font-medium">{fileCount} bài học / tài liệu</span>
          </div>
        </dl>

        {course.description && (
          <p className="text-muted-foreground max-w-prose text-sm whitespace-pre-wrap">
            {course.description}
          </p>
        )}

        {(
          [
            ['Đối tượng học viên', course.targetAudience],
            ['Mục tiêu đạt được', course.learningOutcomes],
            ['Giới thiệu giảng viên', course.instructorBio],
          ] as const
        ).map(([label, value]) =>
          value ? (
            <div key={label} className="flex items-start gap-3">
              <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                <FileText className="size-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {label}
                </dt>
                <dd className="text-foreground max-w-prose text-sm whitespace-pre-wrap">{value}</dd>
              </div>
            </div>
          ) : null,
        )}
      </CardContent>
    </Card>
  );
}
