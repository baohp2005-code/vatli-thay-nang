'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTestAction } from '@/actions/v1/tests/create-test';
import { getTest } from '@/actions/v1/tests/get-test';
import { updateTestAction } from '@/actions/v1/tests/update-test';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { handleActionErrors, handleActionResult } from '@/lib/actions';
import { cn } from '@/lib/utils';
import type { ICreateTestPayload } from '@/types/actions/tests';
import {
  SCORE_EMAIL_DELAY_MINUTES,
  TEST_TYPE_LABEL,
  type TestFilePayload,
  type TestType,
} from '@/types/tests';
import TestFileUploader from './TestFileUploader';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  /** Có testId = sửa, không có = tạo mới. */
  testId?: number;
  /** Loại chọn sẵn khi tạo mới (nút "Tạo bài tập" / "Tạo bài kiểm tra"). */
  initialType?: TestType;
  onSaved?: () => void;
}

const TYPE_HINT: Record<TestType, string> = {
  EXAM: 'Có chấm điểm. Học sinh bấm Bắt đầu mới thấy đề, đồng hồ làm bài chạy từ lúc đó.',
  HOMEWORK: 'Không chấm điểm, không giới hạn thời gian — học sinh chỉ cần nộp bài trước hạn.',
};

const EMAIL_HINT: Record<TestType, string> = {
  EXAM: `Sau khi chấm: tự gửi email báo điểm (kèm nhận xét) cho từng học sinh, ${SCORE_EMAIL_DELAY_MINUTES} phút sau lần lưu điểm cuối cùng — kịp sửa nếu lỡ nhập nhầm. Sửa điểm sau khi đã gửi thì học sinh nhận thêm email cập nhật điểm.`,
  HOMEWORK:
    'Ngay khi lưu: báo bài tập mới kèm ngày mở và hạn nộp. Trước hạn 24 giờ: nhắc những em chưa nộp.',
};

/** BE nhận ISO 8601; input datetime-local cho ra 'YYYY-MM-DDTHH:mm' theo giờ máy. */
function toIso(local: string): string {
  return new Date(local).toISOString();
}

/** Ngược lại: ISO → giá trị cho input datetime-local (theo giờ địa phương). */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TestFormModal({
  open,
  onOpenChange,
  courseId,
  testId,
  initialType = 'EXAM',
  onSaved,
}: Props) {
  const router = useRouter();
  const isEdit = testId !== undefined;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  // File chưa lên xong mà bấm Lưu thì bài lưu thiếu đề, còn file đã lên thành rác trên R2.
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [type, setType] = useState<TestType>(initialType);
  // Bài mới mặc định bật email (bài tập: báo bài + nhắc hạn; bài kiểm tra: báo điểm) — tắt được.
  // Bài cũ thì nạp đúng giá trị đang lưu.
  const [emailNotify, setEmailNotify] = useState(!isEdit);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [maxScore, setMaxScore] = useState('10');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [attachments, setAttachments] = useState<TestFilePayload[]>([]);

  // Nạp dữ liệu bài đang sửa. fileStorageKey chỉ có trong response của admin — thiếu
  // nó thì PATCH sẽ hiểu là "bỏ hết đề cũ" và xoá sạch file trên R2.
  //
  // Không reset form ở đây: component được remount bằng key từ phía cha (xem
  // CourseTestsSection), nên state đã sạch sẵn — reset đồng bộ trong effect chỉ tạo
  // thêm một vòng render thừa.
  useEffect(() => {
    if (!open || !isEdit) return;

    let cancelled = false;
    void getTest(testId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (!res.data) {
        handleActionErrors(res.errors);
        onOpenChange(false);
        return;
      }
      const t = res.data;
      setType(t.type);
      setEmailNotify(t.emailNotify ?? false);
      setTitle(t.title);
      setDescription(t.description ?? '');
      setStartTime(toLocalInput(t.startTime));
      setEndTime(toLocalInput(t.endTime));
      setMaxScore(String(t.maxScore));
      setDurationMinutes(String(t.durationMinutes));
      setAttachments(
        t.attachments.map((a) => ({
          fileStorageKey: a.fileStorageKey!,
          fileName: a.fileName,
          fileSize: a.fileSize ?? undefined,
          mimeType: a.mimeType ?? undefined,
          order: a.order,
        })),
      );
    });
    return () => {
      cancelled = true;
    };
  }, [open, isEdit, testId, onOpenChange]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const isExam = type === 'EXAM';
    const score = Number(maxScore);
    if (!title.trim())
      return handleActionErrors([`Chưa nhập tên ${TEST_TYPE_LABEL[type].toLowerCase()}`]);
    if (!startTime || !endTime) return handleActionErrors(['Chưa chọn thời gian làm bài']);
    if (new Date(endTime) <= new Date(startTime)) {
      return handleActionErrors(['Thời gian kết thúc phải sau thời gian bắt đầu']);
    }
    const duration = Number(durationMinutes);
    if (isExam) {
      if (!Number.isFinite(score) || score <= 0) {
        return handleActionErrors(['Điểm tối đa phải lớn hơn 0']);
      }
      if (!Number.isInteger(duration) || duration < 1 || duration > 1440) {
        return handleActionErrors(['Thời gian làm bài phải từ 1 đến 1440 phút']);
      }
    }

    const payload: ICreateTestPayload = {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      emailNotify,
      startTime: toIso(startTime),
      endTime: toIso(endTime),
      // Bài tập không chấm điểm / không đồng hồ — BE tự điền mặc định khi tạo.
      ...(isExam ? { maxScore: score, durationMinutes: duration } : {}),
      attachments,
    };

    setSaving(true);
    try {
      const res = isEdit
        ? await updateTestAction(courseId, testId, payload)
        : await createTestAction(courseId, payload);

      handleActionResult(
        res.errors,
        () => {
          onOpenChange(false);
          onSaved?.();
          router.refresh();
        },
        isEdit
          ? `Đã cập nhật ${TEST_TYPE_LABEL[type].toLowerCase()}`
          : `Đã tạo ${TEST_TYPE_LABEL[type].toLowerCase()}${!isExam && emailNotify ? ' — email đang được gửi cho học sinh' : ''}`,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && !uploadingFiles && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Sửa' : 'Tạo'} {TEST_TYPE_LABEL[type].toLowerCase()}
          </DialogTitle>
          <DialogDescription>
            Học sinh chỉ xem được đề trong khoảng thời gian làm bài. Hết giờ là khoá nộp.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4" role="status" aria-label="Đang tải bài kiểm tra">
            <div className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-16 w-full" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="min-w-0 space-y-4">
            <div className="space-y-2">
              <Label id="test-type-label">Loại</Label>
              <div
                role="radiogroup"
                aria-labelledby="test-type-label"
                className="bg-muted grid grid-cols-2 gap-1 rounded-lg p-1"
              >
                {(['HOMEWORK', 'EXAM'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={type === value}
                    onClick={() => setType(value)}
                    className={cn(
                      'cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition',
                      type === value
                        ? 'bg-background text-primary shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {TEST_TYPE_LABEL[value]}
                  </button>
                ))}
              </div>
              <p className="text-muted-foreground text-xs">{TYPE_HINT[type]}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-title">Tên {TEST_TYPE_LABEL[type].toLowerCase()}</Label>
              <Input
                id="test-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === 'EXAM' ? 'Kiểm tra 15 phút — Chương 1' : 'Bài tập về nhà — Chương 1'
                }
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-desc">Mô tả / hướng dẫn (tuỳ chọn)</Label>
              <Textarea
                id="test-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Làm ra giấy rồi chụp ảnh nộp lại."
                rows={3}
              />
              <p className="text-muted-foreground text-xs">
                Học sinh chỉ đọc được mô tả sau khi bài bắt đầu — viết đề vào đây cũng an toàn.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="test-start">{type === 'EXAM' ? 'Bắt đầu' : 'Mở từ'}</Label>
                <Input
                  id="test-start"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-end">{type === 'EXAM' ? 'Kết thúc' : 'Hạn nộp'}</Label>
                <Input
                  id="test-end"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border p-3">
              <Checkbox
                id="test-email-notify"
                checked={emailNotify}
                onCheckedChange={(v) => setEmailNotify(v === true)}
                className="mt-0.5"
              />
              <div className="space-y-1">
                <Label htmlFor="test-email-notify" className="cursor-pointer">
                  {type === 'EXAM' ? 'Gửi email báo điểm cho học sinh' : 'Gửi email cho học sinh'}
                </Label>
                <p className="text-muted-foreground text-xs">{EMAIL_HINT[type]}</p>
              </div>
            </div>

            <div
              className={cn(
                'grid grid-cols-1 gap-4 sm:grid-cols-2',
                type === 'HOMEWORK' && 'hidden',
              )}
            >
              <div className="space-y-2">
                <Label htmlFor="test-max" className="block">
                  Điểm tối đa
                </Label>
                <Input
                  id="test-max"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="999.99"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-duration" className="block">
                  Thời gian làm bài (phút)
                </Label>
                <Input
                  id="test-duration"
                  type="number"
                  step="1"
                  min="1"
                  max="1440"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                  className="w-32"
                />
                <p className="text-muted-foreground text-xs">
                  Đếm từ lúc học sinh bấm Bắt đầu; hết giờ tự động nộp.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Đề bài (ảnh / PDF)</Label>
              <TestFileUploader
                folder="test-attachments"
                value={attachments}
                onChange={setAttachments}
                disabled={saving}
                onBusyChange={setUploadingFiles}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                // Đóng giữa chừng thì file đang tải xong sẽ thành object mồ côi trên R2,
                // và người dùng tưởng đã huỷ trong khi tệp vẫn nằm đó.
                disabled={saving || uploadingFiles}
                className="cursor-pointer"
              >
                Huỷ
              </Button>
              <Button type="submit" disabled={saving || uploadingFiles} className="cursor-pointer">
                {uploadingFiles
                  ? 'Đang tải tệp lên…'
                  : saving
                    ? 'Đang lưu…'
                    : isEdit
                      ? 'Lưu thay đổi'
                      : `Tạo ${TEST_TYPE_LABEL[type].toLowerCase()}`}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
