'use client';

import Link from 'next/link';
import { Lock, PlayCircle, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatVideoDuration, recordingLearnHref } from '@/lib/session-recordings';
import type { ClassSessionRecording } from '@/types/actions/session-recordings';

interface Props {
  recording: ClassSessionRecording;
}

/** Khối "Xem lại buổi học" ở trang buổi học của học sinh — video bài giảng giáo viên gắn cho buổi. */
export default function StudentRecordingCard({ recording }: Props) {
  const duration = formatVideoDuration(recording.durationSeconds);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="text-muted-foreground size-5" /> Xem lại buổi học
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-4 sm:pb-6">
        <div className="space-y-1">
          <p className="font-medium break-words">{recording.title}</p>
          <p className="text-muted-foreground text-sm">
            Khóa học: {recording.courseTitle}
            {duration ? ` · ${duration}` : ''}
          </p>
        </div>

        {recording.canOpen ? (
          <Button asChild className="w-full cursor-pointer sm:w-fit">
            <Link href={recordingLearnHref(recording.courseId, recording.nodeId)}>
              <PlayCircle className="size-4" /> Xem lại bài học
            </Link>
          </Button>
        ) : (
          <p
            role="status"
            className="bg-muted text-muted-foreground flex gap-2 rounded-md p-3 text-sm"
          >
            <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Bạn chưa mở được video này — có thể bạn chưa được ghi danh khóa học &quot;
              {recording.courseTitle}&quot; hoặc video chưa sẵn sàng. Hãy liên hệ giáo viên để được
              hỗ trợ.
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
