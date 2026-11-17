'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { listCourses } from '@/actions/v1/courses/list-courses';
import { getCourse } from '@/actions/v1/courses/get-course';
import { setSessionRecordingAction } from '@/actions/v1/session-recordings/set-session-recording';
import { handleActionErrors, handleActionResult } from '@/lib/actions';
import {
  formatVideoDuration,
  listCourseVideos,
  type RecordingVideoOption,
} from '@/lib/session-recordings';
import { cn } from '@/lib/utils';
import { BUNNY_STATUS_META, type CourseRow } from '@/types/course-management';
import type { RecordingStudentRow } from '@/types/actions/session-recordings';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classSessionId: number;
  /** Record đang gắn — mở dialog thì chọn sẵn. */
  current: { courseId: number; nodeId: number } | null;
  /** Học sinh vắng buổi này — để cảnh báo ai chưa ghi danh khóa đang chọn. */
  missedStudents: RecordingStudentRow[];
  onSaved: () => void;
}

const TRIGGER_CLASS =
  'border-input-border hover:text-foreground w-full cursor-pointer justify-between bg-white px-3 font-normal hover:bg-white';

/** Đủ cho số khóa học của một trung tâm; BE giới hạn pageSize ≤ 100. */
const COURSE_PAGE_SIZE = 100;

export default function RecordingPickerDialog({
  open,
  onOpenChange,
  classSessionId,
  current,
  missedStudents,
  onSaved,
}: Props) {
  const [courses, setCourses] = useState<CourseRow[] | null>(null);
  const [courseId, setCourseId] = useState<number | null>(current?.courseId ?? null);
  const [videos, setVideos] = useState<RecordingVideoOption[] | null>(null);
  const [loadingVideos, setLoadingVideos] = useState(current !== null);
  const [nodeId, setNodeId] = useState<number | null>(current?.nodeId ?? null);
  const [courseOpen, setCourseOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Đổi khóa liên tục: chỉ nhận kết quả của lần chọn cuối cùng.
  const videoRequest = useRef(0);

  const fetchVideos = useCallback((id: number) => {
    const request = ++videoRequest.current;
    getCourse(id)
      .then((course) => {
        if (request !== videoRequest.current) return;
        setVideos(course ? listCourseVideos(course) : []);
      })
      .catch(() => {
        if (request !== videoRequest.current) return;
        handleActionErrors(['Không tải được nội dung khóa học']);
        setVideos([]);
      })
      .finally(() => {
        if (request === videoRequest.current) setLoadingVideos(false);
      });
  }, []);

  // Dialog chỉ được mount khi mở (xem SessionRecordingCard) nên chạy một lần mỗi lần mở.
  // Chỉ khóa đã xuất bản: khóa nháp / lưu trữ thì học sinh mở trang học bị 404, BE từ chối.
  useEffect(() => {
    let cancelled = false;
    const requests = videoRequest;
    listCourses({ status: 'PUBLISHED', page: 1, pageSize: COURSE_PAGE_SIZE }).then((res) => {
      if (cancelled) return;
      handleActionErrors(res.errors);
      setCourses(res.data);
    });
    if (current) fetchVideos(current.courseId);
    return () => {
      cancelled = true;
      // Đóng dialog: bỏ qua mọi kết quả tải video còn đang chạy.
      requests.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ chạy lúc mở dialog
  }, []);

  const selectCourse = (id: number) => {
    setCourseOpen(false);
    if (id === courseId) return;
    setCourseId(id);
    setNodeId(null);
    setVideos(null);
    setLoadingVideos(true);
    fetchVideos(id);
  };

  const selectedCourse = courses?.find((c) => c.id === courseId) ?? null;
  const selectedVideo = videos?.find((v) => v.nodeId === nodeId) ?? null;

  const notEnrolled = useMemo(
    () =>
      courseId === null ? [] : missedStudents.filter((s) => !s.activeCourseIds.includes(courseId)),
    [missedStudents, courseId],
  );

  const handleSave = async () => {
    if (nodeId === null) return;
    setSaving(true);
    try {
      const result = await setSessionRecordingAction(classSessionId, nodeId);
      const reminded = result.reminded ?? 0;
      const ok = handleActionResult(
        result.errors,
        onSaved,
        reminded > 0
          ? `Đã lưu record và gửi email nhắc xem lại cho ${reminded} học sinh`
          : 'Đã lưu record cho buổi học',
      );
      if (ok && result.remindFailed) {
        handleActionErrors([
          'Record đã lưu nhưng chưa xếp được email nhắc — hãy bấm "Gửi nhắc xem lại" sau ít phút.',
        ]);
      }
      if (ok) onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!saving) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{current ? 'Đổi record buổi học' : 'Chọn record buổi học'}</DialogTitle>
          <DialogDescription>
            Chọn một video bài giảng đã có trong khóa học. Chỉ học sinh đang ghi danh khóa đó mới mở
            được video.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="recording-course">Khóa học</Label>
            <Popover open={courseOpen} onOpenChange={setCourseOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="recording-course"
                  variant="outline"
                  type="button"
                  role="combobox"
                  aria-expanded={courseOpen}
                  disabled={courses === null || saving}
                  className={TRIGGER_CLASS}
                >
                  <span className="truncate">
                    {courses === null
                      ? 'Đang tải khóa học...'
                      : (selectedCourse?.title ?? 'Chọn khóa học')}
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                <Command>
                  <CommandInput placeholder="Tìm theo tên hoặc mã khóa..." />
                  <CommandList>
                    <CommandEmpty>Không có khóa học đã xuất bản nào khớp</CommandEmpty>
                    <CommandGroup>
                      {(courses ?? []).map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.title} ${c.code} #${c.id}`}
                          onSelect={() => selectCourse(c.id)}
                        >
                          <Check
                            className={cn(
                              'size-4',
                              c.id === courseId ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <span className="truncate">{c.title}</span>
                          <span className="text-muted-foreground ml-auto shrink-0 text-xs">
                            {c.code}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recording-video">Video</Label>
            <Popover open={videoOpen} onOpenChange={setVideoOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="recording-video"
                  variant="outline"
                  type="button"
                  role="combobox"
                  aria-expanded={videoOpen}
                  disabled={courseId === null || loadingVideos || !videos?.length || saving}
                  className={TRIGGER_CLASS}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    {loadingVideos && <Loader2 className="size-4 shrink-0 animate-spin" />}
                    <span className="truncate">
                      {courseId === null
                        ? 'Chọn khóa học trước'
                        : loadingVideos
                          ? 'Đang tải video...'
                          : videos && videos.length === 0
                            ? 'Khóa học chưa có video nào'
                            : (selectedVideo?.title ?? 'Chọn video')}
                    </span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
                <Command>
                  <CommandInput placeholder="Tìm video..." />
                  <CommandList>
                    <CommandEmpty>Không tìm thấy video</CommandEmpty>
                    <CommandGroup>
                      {(videos ?? []).map((v) => {
                        const duration = formatVideoDuration(v.durationSeconds);
                        return (
                          <CommandItem
                            key={v.nodeId}
                            value={`${v.title} ${v.path} #${v.nodeId}`}
                            disabled={!v.ready}
                            onSelect={() => {
                              setNodeId(v.nodeId);
                              setVideoOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'size-4 shrink-0',
                                v.nodeId === nodeId ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate">{v.title}</span>
                              {(v.path || duration) && (
                                <span className="text-muted-foreground block truncate text-xs">
                                  {[v.path, duration].filter(Boolean).join(' · ')}
                                </span>
                              )}
                            </span>
                            {!v.ready && (
                              <Badge
                                variant={BUNNY_STATUS_META[v.bunnyStatus ?? 'ERROR'].variant}
                                className="shrink-0"
                              >
                                {BUNNY_STATUS_META[v.bunnyStatus ?? 'ERROR'].label}
                              </Badge>
                            )}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <p className="text-muted-foreground text-xs">
              Video còn đang tải lên / xử lý thì chưa chọn được.
            </p>
          </div>

          {courseId !== null && notEnrolled.length > 0 && (
            <div
              role="status"
              className="flex gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800"
            >
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
              <div className="space-y-1">
                <p className="font-medium">
                  {notEnrolled.length} học sinh vắng chưa ghi danh khoá này nên không nhận được
                  link.
                </p>
                <p>
                  {notEnrolled
                    .slice(0, 5)
                    .map((s) => s.fullName || s.email)
                    .join(', ')}
                  {notEnrolled.length > 5 ? `, và ${notEnrolled.length - 5} em khác` : ''}. Ghi danh
                  các em vào khóa ở trang Khóa học nếu muốn các em xem được.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="cursor-pointer"
          >
            Huỷ
          </Button>
          <Button
            onClick={handleSave}
            disabled={nodeId === null || saving || nodeId === current?.nodeId}
            className="cursor-pointer"
          >
            {saving ? 'Đang lưu...' : 'Lưu record'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
