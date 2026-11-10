'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlarmClock,
  ArrowLeft,
  Award,
  BarChart3,
  CalendarClock,
  FileText,
  Lock,
  Play,
  TimerOff,
  Upload,
} from 'lucide-react';
import { getTest } from '@/actions/v1/tests/get-test';
import { listParticipants } from '@/actions/v1/tests/list-participants';
import { startTestAction } from '@/actions/v1/tests/start-test';
import { upsertSubmissionAction } from '@/actions/v1/tests/upsert-submission';
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
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { handleActionErrors, handleActionSuccess } from '@/lib/actions';
import { formatDateTimeShort } from '@/lib/format';
import type {
  MySubmission,
  ParticipantsResult,
  StudentTestDetail as TDetail,
  TestFilePayload,
} from '@/types/tests';
import ClassRankCard from './ClassRankCard';
import ScoreDistributionChart from './ScoreDistributionChart';
import TestAttachmentViewer from './TestAttachmentViewer';
import TestFileUploader from './TestFileUploader';

interface Props {
  courseId: number;
  testId: number;
  onBack: () => void;
}

type ScoreTier = 'low' | 'mid' | 'high';

const SCORE_TIER_CLASS: Record<ScoreTier, string> = {
  low: 'bg-red-500',
  mid: 'bg-yellow-500',
  high: 'bg-green-500',
};

function scoreTier(score: number, maxScore: number): ScoreTier {
  const ratio = maxScore > 0 ? score / maxScore : 0;
  if (ratio >= 0.8) return 'high';
  if (ratio >= 0.5) return 'mid';
  return 'low';
}

/** Màn chi tiết một bài kiểm tra phía học sinh. Gate theo phase chỉ để ẩn UI — BE mới chốt. */
export default function StudentTestDetail({ courseId, testId, onBack }: Props) {
  const [test, setTest] = useState<TDetail | null>(null);
  const [participants, setParticipants] = useState<ParticipantsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  // Đồng hồ đếm ngược thời gian làm bài — tick mỗi giây khi có lượt đang chạy.
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [clockOffsetMs, setClockOffsetMs] = useState(0);
  const mountedRef = useRef(true);
  const requestSeqRef = useRef(0);

  // Được admin mở lại nộp bù thì hạn là reopenUntil, kể cả khi bài đã kết thúc.
  const deadlineMs = test?.myReopen
    ? new Date(test.myReopen.reopenUntil).getTime()
    : test?.phase === 'ONGOING' && test.myAttempt
      ? new Date(test.myAttempt.deadlineAt).getTime()
      : null;

  useEffect(() => {
    if (deadlineMs === null) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [deadlineMs]);

  const load = useCallback(async (): Promise<boolean> => {
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    const isCurrent = () => mountedRef.current && requestSeqRef.current === seq;

    const res = await getTest<TDetail>(testId);
    if (!isCurrent()) return false;

    if (!res.data) {
      handleActionErrors(res.errors);
      setTest(null);
      setParticipants(null);
      setLoading(false);
      return false;
    }

    setTest(res.data);
    if (res.serverTime) setClockOffsetMs(new Date(res.serverTime).getTime() - Date.now());
    setLoading(false);

    // Chưa tới giờ thì BE chặn tab thống kê (403) — đừng gọi cho phí.
    if (res.data.phase === 'SCHEDULED') {
      setParticipants(null);
      return true;
    }

    const p = await listParticipants(testId);
    if (!isCurrent()) return false;
    setParticipants(p.errors.length ? null : p);
    return true;
  }, [testId]);

  useEffect(() => {
    mountedRef.current = true;
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      mountedRef.current = false;
      requestSeqRef.current += 1;
    };
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Đang tải bài kiểm tra">
        <Skeleton className="h-8 w-40" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-md" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }
  if (!test) {
    return (
      <div className="space-y-3">
        <BackButton onBack={onBack} />
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            Không mở được bài kiểm tra này.
          </CardContent>
        </Card>
      </div>
    );
  }

  const scheduled = test.phase === 'SCHEDULED';
  const ongoing = test.phase === 'ONGOING';
  const ended = test.phase === 'ENDED';
  // Bài tập: không có màn "Bắt đầu" (BE trả sẵn myAttempt với hạn = endTime), không thang điểm.
  const isHomework = test.type === 'HOMEWORK';
  // Chấm xong là thấy điểm + nhận xét ngay, không chờ bài kết thúc.
  const hasResult = test.mySubmissionStatus === 'GRADED';

  // Giới hạn thời gian làm bài: đang mở mà CHƯA bấm Bắt đầu thì đề bị giấu (BE chốt),
  // chỉ hiện màn bắt đầu. Đã bắt đầu thì chạy đếm ngược tới hạn cá nhân.
  // Đang trong hạn nộp bù admin cấp — bỏ qua cả phase lẫn màn "Bắt đầu làm bài".
  const remainingMs = deadlineMs === null ? null : Math.max(0, deadlineMs - nowMs - clockOffsetMs);
  const reopened = test.myReopen !== null && remainingMs !== null && remainingMs > 0;
  const submittable = (ongoing || reopened) && !scheduled;
  const notStarted = ongoing && !test.myAttempt && !reopened;
  const expired = submittable && remainingMs === 0;
  // Đã chấm thì không tự nộp lại được (BE chặn) — trừ khi giáo viên mở lại cho em đó.
  const gradedLocked = test.mySubmissionStatus === 'GRADED' && !reopened;

  async function handleStart() {
    if (starting) return;
    setStarting(true);
    try {
      const res = await startTestAction(testId);
      if (!mountedRef.current) return;
      if (res.errors.length) {
        handleActionErrors(res.errors);
        return;
      }
      setStartOpen(false);
      // Tải lại để nhận đề + myAttempt (đề chỉ mở sau khi có lượt).
      await load();
    } finally {
      if (mountedRef.current) setStarting(false);
    }
  }

  return (
    <div className="space-y-4">
      <BackButton onBack={onBack} disabled={uploading} />

      <div>
        <h2 className="text-lg font-semibold">{test.title}</h2>
        <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span>
            {formatDateTimeShort(test.startTime)} → {formatDateTimeShort(test.endTime)}
          </span>
          <span aria-hidden className="text-input-border">
            ·
          </span>
          {isHomework ? (
            <span>Bài tập — chỉ cần nộp trước hạn</span>
          ) : (
            <>
              <span>Thang điểm {test.maxScore}</span>
              <span aria-hidden className="text-input-border">
                ·
              </span>
              <span>Làm bài {test.durationMinutes} phút</span>
            </>
          )}
          <Badge variant={ongoing ? 'default' : ended ? 'secondary' : 'outline'}>
            {scheduled ? 'Sắp diễn ra' : ongoing ? 'Đang mở' : 'Đã kết thúc'}
          </Badge>
        </div>
      </div>

      {scheduled ? (
        <Card>
          <CardContent className="text-muted-foreground space-y-2 py-10 text-center text-sm">
            <Lock className="mx-auto size-8" />
            <p>
              Chưa tới giờ làm bài. Đề mở lúc{' '}
              <strong className="text-foreground">{formatDateTimeShort(test.startTime)}</strong>.
            </p>
          </CardContent>
        </Card>
      ) : notStarted ? (
        /* Đang mở nhưng chưa bấm Bắt đầu: đề bị giấu (BE), chỉ hiện màn bắt đầu. */
        <Card>
          <CardContent className="space-y-4 py-10 text-center">
            <AlarmClock className="text-purple mx-auto size-10" />
            <div className="space-y-1">
              <p className="font-medium">
                Bài kiểm tra kéo dài{' '}
                <strong className="text-purple">{test.durationMinutes} phút</strong>
              </p>
              <p className="text-muted-foreground mx-auto max-w-md text-sm">
                Đồng hồ chạy ngay khi bấm Bắt đầu,{' '}
                <strong className="text-foreground">không tạm dừng được</strong>. Hết giờ, bài tự
                động nộp.
              </p>
              <p className="text-muted-foreground text-xs">
                Hạn chót nộp: {formatDateTimeShort(test.endTime)}
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setStartOpen(true)}
              disabled={starting}
              className="cursor-pointer"
            >
              <Play /> Bắt đầu làm bài
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Được mở lại nộp bù: nói rõ hạn, vì trạng thái bài vẫn hiện "Đã kết thúc". */}
          {reopened && (
            <div className="flex items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              <CalendarClock className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">
                  Giáo viên đã mở lại bài này cho bạn nộp đến{' '}
                  {formatDateTimeShort(test.myReopen!.reopenUntil)}.
                </p>
                {test.myReopen!.reason && (
                  <p className="mt-0.5 text-emerald-700">Lý do: {test.myReopen!.reason}</p>
                )}
              </div>
            </div>
          )}

          {/* Đếm ngược — chỉ khi đã bắt đầu lượt làm và còn nộp được (chưa khoá vì đã chấm). */}
          {submittable && !gradedLocked && remainingMs !== null && (
            <div
              role="timer"
              aria-live="off"
              className={cn(
                'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium',
                expired
                  ? 'border-destructive/30 bg-destructive/5 text-destructive'
                  : remainingMs <= 5 * 60 * 1000
                    ? 'border-destructive/30 bg-destructive/5 text-destructive'
                    : 'border-purple/30 bg-purple/5 text-purple',
              )}
            >
              {expired ? <TimerOff className="size-4" /> : <AlarmClock className="size-4" />}
              {expired ? (
                <span>{isHomework ? 'Đã hết hạn nộp bài.' : 'Đã hết thời gian làm bài.'}</span>
              ) : isHomework && !reopened ? (
                <span>
                  Hạn nộp {formatDateTimeShort(test.endTime)} — còn{' '}
                  <span className="tabular-nums">{formatRemaining(remainingMs)}</span>.
                </span>
              ) : (
                <span>
                  Còn lại <span className="tabular-nums">{formatRemaining(remainingMs)}</span> — hết
                  giờ tự động nộp.
                </span>
              )}
            </div>
          )}
          {/* Vào bài là đọc ĐỀ trước — tab Nộp bài chỉ là bước sau khi làm xong. */}
          <Tabs defaultValue={hasResult ? 'result' : 'paper'}>
            {/*
            Khoá đổi tab khi đang tải tệp: tab Nộp bài bị unmount là uploader đi theo,
            tệp vẫn lên tới R2 nhưng không còn ai giữ nó — quay lại thấy form trống như
            chưa từng chọn, còn tệp thì nằm lại đó không ai dọn.
          */}
            <TabsList className="max-w-full justify-start overflow-x-auto">
              <TabsTrigger value="paper" disabled={uploading} className="cursor-pointer">
                <FileText /> Đề bài
              </TabsTrigger>
              <TabsTrigger value="submit" disabled={uploading} className="cursor-pointer">
                <Upload /> Nộp bài
                {/* Chấm nhỏ báo đã nộp — quét nhanh không cần mở tab. */}
                {test.mySubmissionStatus !== 'NOT_SUBMITTED' && (
                  <span className="inline-block size-1.5 rounded-full bg-green-500" aria-hidden />
                )}
              </TabsTrigger>
              <TabsTrigger value="stats" disabled={uploading} className="cursor-pointer">
                <BarChart3 /> Thống kê
              </TabsTrigger>
              <TabsTrigger value="result" disabled={uploading} className="cursor-pointer">
                <Award /> Kết quả
                {hasResult && (
                  <span className="bg-purple inline-block size-1.5 rounded-full" aria-hidden />
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="paper" className="mt-4">
              {test.description && (
                <div className="bg-muted mb-3 rounded-lg p-3 text-sm whitespace-pre-wrap">
                  {test.description}
                </div>
              )}
              <TestAttachmentViewer files={test.attachments} emptyHint="Bài này không có tệp đề" />
            </TabsContent>

            <TabsContent value="submit" className="mt-4">
              <SubmitTab
                // Remount sau mỗi lần nộp để form nạp lại đúng bài vừa lưu.
                key={test.mySubmission?.updatedAt ?? 'chua-nop'}
                courseId={courseId}
                testId={testId}
                ongoing={submittable}
                deadlineAt={test.myAttempt?.deadlineAt ?? test.endTime}
                expired={expired}
                gradedLocked={gradedLocked}
                status={test.mySubmissionStatus}
                mySubmission={test.mySubmission}
                onSubmitted={load}
                onUploadingChange={setUploading}
              />
            </TabsContent>

            <TabsContent value="stats" className="mt-4">
              <StatsTab participants={participants} maxScore={test.maxScore} ended={ended} />
            </TabsContent>

            <TabsContent value="result" className="mt-4">
              {hasResult ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardContent className="flex h-full flex-col justify-center space-y-3 py-4 sm:py-6">
                        <p className="text-muted-foreground text-sm">Điểm của bạn</p>
                        <p className="text-3xl font-semibold">
                          {test.myScore}
                          <span className="text-muted-foreground text-lg"> / {test.maxScore}</span>
                        </p>
                        {test.myScore !== null && (
                          <Progress
                            value={(test.myScore / test.maxScore) * 100}
                            indicatorClassName={
                              SCORE_TIER_CLASS[scoreTier(test.myScore, test.maxScore)]
                            }
                          />
                        )}
                      </CardContent>
                    </Card>
                    {participants && (
                      <ClassRankCard
                        rank={participants.myRank}
                        gradedCount={participants.gradedCount}
                        pendingCount={participants.pendingCount}
                        minGraded={participants.minGradedForDistribution}
                      />
                    )}
                  </div>

                  {test.mySubmission?.feedback && (
                    <Card>
                      <CardContent className="space-y-2 py-4 sm:py-6">
                        <p className="text-muted-foreground text-sm">Nhận xét của giáo viên</p>
                        <p className="text-sm whitespace-pre-wrap">{test.mySubmission.feedback}</p>
                      </CardContent>
                    </Card>
                  )}

                  {test.mySubmission && (
                    <Card>
                      <CardContent className="space-y-3 py-4 sm:py-6">
                        <p className="text-sm font-medium">Bài làm của bạn</p>
                        {test.mySubmission.note && (
                          <div className="bg-muted rounded-md p-3 text-sm whitespace-pre-wrap">
                            {test.mySubmission.note}
                          </div>
                        )}
                        <TestAttachmentViewer
                          files={test.mySubmission.files}
                          emptyHint="Bạn không nộp tệp nào"
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card>
                  <CardContent className="text-muted-foreground py-10 text-center text-sm">
                    {test.mySubmissionStatus === 'NOT_SUBMITTED'
                      ? 'Bạn chưa nộp bài.'
                      : 'Giáo viên chưa chấm bài của bạn. Điểm và nhận xét sẽ hiện ở đây ngay khi chấm xong.'}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {/* Xác nhận bắt đầu — bấm rồi là đồng hồ chạy, không quay lại được. */}
      <AlertDialog open={startOpen} onOpenChange={(o) => !starting && setStartOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bắt đầu làm bài?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có <strong>{test.durationMinutes} phút</strong>, không tạm dừng được. Hết giờ bài
              sẽ tự động nộp.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={starting} className="cursor-pointer">
              Để sau
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleStart();
              }}
              disabled={starting}
              className="cursor-pointer"
            >
              {starting ? 'Đang mở đề…' : 'Bắt đầu ngay'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** mm:ss (hoặc h:mm:ss khi trên 1 giờ) cho đồng hồ đếm ngược. */
function formatRemaining(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  // Bài tập có thể mở nhiều ngày — "120:00:00" khó đọc hơn "5 ngày 0:00:00".
  if (h >= 24) return `${Math.floor(h / 24)} ngày ${h % 24}:${pad(m)}:${pad(s)}`;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function BackButton({ onBack, disabled }: { onBack: () => void; disabled?: boolean }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onBack}
      // Rời màn giữa lúc tải tệp: tệp vẫn lên tới R2 nhưng không bài nộp nào trỏ vào nó
      // nữa — thành rác không ai dọn, còn học sinh tưởng mình đã huỷ.
      disabled={disabled}
      className="-ml-2 cursor-pointer"
    >
      <ArrowLeft /> Danh sách bài kiểm tra
    </Button>
  );
}

function SubmitTab({
  courseId,
  testId,
  ongoing,
  deadlineAt,
  expired,
  gradedLocked,
  status,
  mySubmission,
  onSubmitted,
  onUploadingChange,
}: {
  courseId: number;
  testId: number;
  ongoing: boolean;
  /** Hạn nộp cá nhân (startedAt + thời gian làm bài, chặn bởi endTime). */
  deadlineAt: string;
  /** Đồng hồ cá nhân đã về 0 — khoá form + tự nộp phần đang dở. */
  expired: boolean;
  /** Bài đã chấm và không được mở lại — khoá nộp lại để điểm/nhận xét không bị xoá. */
  gradedLocked: boolean;
  status: TDetail['mySubmissionStatus'];
  mySubmission: MySubmission | null;
  onSubmitted: () => Promise<boolean>;
  onUploadingChange: (uploading: boolean) => void;
}) {
  // Nạp sẵn bài đã nộp: nộp lại là GHI ĐÈ, nên form trống đồng nghĩa bổ sung một tấm ảnh
  // cũng phải tải lại toàn bộ từ đầu, còn ghi chú cũ thì mất. Cha remount tab này bằng
  // key = updatedAt sau mỗi lần nộp, nên state khởi tạo luôn khớp dữ liệu mới nhất.
  const [files, setFiles] = useState<TestFilePayload[]>(() =>
    (mySubmission?.files ?? []).map((f, i) => ({
      fileStorageKey: f.fileStorageKey!,
      fileName: f.fileName,
      fileSize: f.fileSize ?? undefined,
      mimeType: f.mimeType ?? undefined,
      order: i,
    })),
  );
  const [note, setNote] = useState(mySubmission?.note ?? '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Hết giờ đã tự nộp thành công (để hiện đúng thông báo ở màn khoá).
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);
  const autoSubmitFiredRef = useRef(false);

  // Tab này còn cần `uploading` cho nút bấm của mình, nhưng cha cũng phải biết để khoá
  // nút Quay lại — nên báo lên cả hai nơi.
  const handleUploadingChange = useCallback(
    (busy: boolean) => {
      setUploading(busy);
      onUploadingChange(busy);
    },
    [onUploadingChange],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Đổi tab giữa lúc tải sẽ unmount tab này. Không trả cờ về false thì nút Quay lại
      // của cha kẹt disabled vĩnh viễn.
      onUploadingChange(false);
    };
  }, [onUploadingChange]);

  // Hết giờ → TỰ ĐỘNG NỘP phần đang dở, đúng một lần. Chỉ nộp khi có thay đổi so với
  // bài đã lưu: nộp lại y nguyên sẽ reset trạng thái GRADED → SUBMITTED và xoá điểm
  // (admin có thể đã chấm sớm trong giờ). BE có 30s nhân nhượng sau hạn cho request này.
  useEffect(() => {
    if (!expired || autoSubmitFiredRef.current) return;
    autoSubmitFiredRef.current = true;
    const savedKeys = (mySubmission?.files ?? []).map((f) => f.fileStorageKey).join('|');
    const currentKeys = files.map((f) => f.fileStorageKey).join('|');
    const dirty = savedKeys !== currentKeys || note.trim() !== (mySubmission?.note ?? '');
    if (dirty && files.length > 0 && !uploading) void submit(true);
    // Cố ý chỉ chạy theo `expired` — chụp files/note tại đúng khoảnh khắc hết giờ.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  // Hết giờ hoặc đã chấm là khoá hẳn. BE cũng chặn (403) — đây chỉ là để không mời gọi bấm.
  const timeLocked = !ongoing || expired;
  if (timeLocked || gradedLocked) {
    return (
      <Card>
        <CardContent className="text-muted-foreground space-y-2 py-10 text-center text-sm">
          <Lock className="mx-auto size-8" />
          <p>
            {expired
              ? 'Đã hết thời gian làm bài.'
              : timeLocked
                ? 'Đã hết thời gian nộp bài.'
                : 'Bài của bạn đã được chấm nên không nộp lại được nữa.'}
          </p>
          {saving ? (
            <p className="text-foreground">Đang tự động nộp bài của bạn…</p>
          ) : autoSubmitted ? (
            <p className="text-foreground">Bài đang dở đã được tự động nộp.</p>
          ) : status === 'GRADED' ? (
            <p className="text-foreground">
              Xem điểm và nhận xét ở tab Kết quả.
              {!timeLocked && ' Cần nộp lại thì liên hệ giáo viên để được mở lại.'}
            </p>
          ) : status !== 'NOT_SUBMITTED' ? (
            <p className="text-foreground">Bài của bạn đã được ghi nhận.</p>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  async function submit(auto = false) {
    if (submittingRef.current || uploading) return;
    if (!files.length) return handleActionErrors(['Chưa chọn tệp bài làm nào']);
    submittingRef.current = true;
    setSaving(true);
    try {
      const res = await upsertSubmissionAction(courseId, testId, {
        note: note.trim() || undefined,
        files,
      });

      if (!mountedRef.current) return;
      if (res.errors.length) {
        handleActionErrors(res.errors);
        return;
      }

      handleActionSuccess(auto ? 'Hết giờ — bài đã được tự động nộp' : 'Nộp bài thành công');
      if (auto) setAutoSubmitted(true);
      // Không xoá form ở đây: cha tải lại rồi remount tab này với bài vừa nộp, để học
      // sinh thấy đúng thứ mình đang giữ và sửa tiếp được.
      await onSubmitted();
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSaving(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-4 sm:py-6">
        {status === 'GRADED' ? (
          // Chỉ tới được đây khi giáo viên đã mở lại (gradedLocked = false).
          <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
            Bài đã được chấm. Nộp lại sẽ <strong>thay bài cũ và xoá điểm hiện tại</strong> — giáo
            viên sẽ chấm lại.
          </p>
        ) : (
          mySubmission && (
            <p className="bg-muted rounded-md p-3 text-sm">
              Đã nộp lúc <strong>{formatDateTimeShort(mySubmission.updatedAt)}</strong>. Có thể nộp
              lại (thay bài cũ) đến <strong>{formatDateTimeShort(deadlineAt)}</strong>, cho tới khi
              giáo viên chấm bài.
            </p>
          )
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Tệp bài làm (ảnh / PDF / .txt)</p>
          <TestFileUploader
            folder="test-submissions"
            testId={testId}
            value={files}
            onChange={setFiles}
            disabled={saving}
            onBusyChange={handleUploadingChange}
          />
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Ghi chú (tuỳ chọn)</p>
          <Textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={saving}
            placeholder="Em nộp 3 trang ạ…"
          />
        </div>

        <Button
          onClick={() => void submit()}
          disabled={saving || uploading || files.length === 0}
          className="w-full cursor-pointer"
        >
          {uploading
            ? 'Đang tải tệp lên…'
            : saving
              ? 'Đang nộp…'
              : status === 'NOT_SUBMITTED'
                ? 'Nộp bài'
                : 'Cập nhật bài nộp'}
        </Button>
      </CardContent>
    </Card>
  );
}

function StatsTab({
  participants,
  maxScore,
  ended,
}: {
  participants: ParticipantsResult | null;
  maxScore: number;
  ended: boolean;
}) {
  if (!participants) {
    return (
      <Card>
        <CardContent className="text-muted-foreground py-10 text-center text-sm">
          Chưa có dữ liệu thống kê.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {ended && (
        <Card>
          <CardContent className="py-4 sm:py-6">
            <p className="mb-2 text-sm font-medium">
              Phổ điểm cả lớp
              {participants.myScore !== null && (
                <span className="text-muted-foreground ml-2 font-normal">
                  · điểm của bạn: {participants.myScore}/{maxScore}
                  {participants.myRank &&
                    ` · hạng ${participants.myRank.rank}/${participants.gradedCount}`}
                </span>
              )}
            </p>
            {participants.distribution ? (
              <ScoreDistributionChart
                distribution={participants.distribution}
                highlightScore={participants.myScore}
                maxScore={maxScore}
              />
            ) : (
              // BE giấu phổ điểm khi lớp quá ít bài đã chấm: biểu đồ "ẩn danh" của lớp
              // vài người thì nhìn là biết điểm của nhau.
              <p className="text-muted-foreground py-8 text-center text-sm">
                Chưa đủ dữ liệu để hiển thị phổ điểm
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-4 sm:py-6">
          <p className="mb-3 text-sm font-medium">Tình hình nộp bài của lớp</p>
          <ul className="divide-divide divide-y text-sm">
            {participants.data.map((p, i) => (
              <li key={`${p.fullName}-${i}`} className="flex items-center justify-between py-2">
                <span>
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  {p.fullName ?? '—'}
                </span>
                <Badge variant={p.hasSubmitted ? 'default' : 'outline'}>
                  {p.hasSubmitted ? 'Đã nộp' : 'Chưa nộp'}
                </Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
