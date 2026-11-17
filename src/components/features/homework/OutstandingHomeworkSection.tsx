import Link from 'next/link';
import { AlertTriangle, ArrowRight, ClipboardList } from 'lucide-react';
import type { listOutstandingHomework } from '@/actions/v1/homework/list-outstanding-homework';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeShort, formatLateDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { OutstandingHomework } from '@/types/tests';

/** Dashboard chỉ cần thấy việc gấp nhất — danh sách đầy đủ nằm trong từng khóa học. */
const MAX_ITEMS = 8;

/**
 * Mục "Bài tập còn nợ" trên dashboard học sinh (server component): cùng dữ liệu với email
 * 20h Chủ nhật. BE đã xếp sẵn — quá hạn lâu nhất trước, rồi tới bài hạn gần nhất. Mỗi dòng
 * mở thẳng bài đó trong tab Bài kiểm tra của khóa học. Không nợ bài nào thì không hiện gì.
 */
export default async function OutstandingHomeworkSection({
  outstandingPromise,
}: {
  outstandingPromise: ReturnType<typeof listOutstandingHomework>;
}) {
  // "trễ N ngày / còn N giờ" tính theo mốc lấy dữ liệu trên server — không lệch hydrate.
  const { data, fetchedAt: now } = await outstandingPromise;
  if (data.length === 0) return null;

  const overdueCount = data.filter((h) => h.overdue).length;
  const shown = data.slice(0, MAX_ITEMS);
  const more = data.length - shown.length;

  return (
    <Card className="gap-0">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="text-muted-foreground size-5" /> Bài tập còn nợ
          </CardTitle>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary">{data.length} bài chưa nộp</Badge>
            {overdueCount > 0 && <Badge variant="destructive">{overdueCount} bài quá hạn</Badge>}
          </div>
        </div>
        {overdueCount > 0 && (
          <p className="text-muted-foreground mt-1 flex items-start gap-1.5 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
            Bài quá hạn vẫn nộp được — bài sẽ được ghi nhận nộp muộn.
          </p>
        )}
      </CardHeader>
      <CardContent className="pb-4 sm:pb-6">
        <ul className="divide-divide divide-y">
          {shown.map((h) => (
            <li key={h.testId}>
              <HomeworkLink homework={h} now={now} />
            </li>
          ))}
        </ul>
        {more > 0 && (
          <p className="text-muted-foreground pt-2 text-sm">
            … và {more} bài khác — xem trong tab Bài kiểm tra của từng khóa học.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function HomeworkLink({ homework: h, now }: { homework: OutstandingHomework; now: number }) {
  const endMs = new Date(h.endTime).getTime();
  return (
    <Link
      href={`/dashboard/courses/${h.courseId}/learn?tab=exams&test=${h.testId}`}
      className={cn(
        'group hover:bg-muted/50 focus-visible:ring-ring -mx-2 flex items-center justify-between gap-3 rounded-md border-l-2 px-2 py-2.5 transition focus-visible:ring-2 focus-visible:outline-none',
        h.overdue ? 'border-l-red-400' : 'border-l-transparent',
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{h.title}</p>
        <p className="text-muted-foreground truncate text-xs">
          {h.courseTitle} · hạn {formatDateTimeShort(h.endTime)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {h.overdue ? (
          <Badge variant="destructive">Trễ {formatLateDuration(now - endMs)}</Badge>
        ) : (
          <Badge variant="warning">Còn {formatLateDuration(Math.max(0, endMs - now))}</Badge>
        )}
        <ArrowRight className="text-muted-foreground size-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
