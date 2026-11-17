import type { BunnyVideoStatus, CourseDetail } from '@/types/course-management';
import { flattenTree } from '@/lib/course-navigation';

/** Link mở thẳng video trong trang học — LearnClient đọc `?item=`. Khớp `recordingLearnPath` phía BE. */
export function recordingLearnHref(courseId: number, nodeId: number): string {
  return `/dashboard/courses/${courseId}/learn?item=${nodeId}`;
}

/** "1 giờ 5 phút", "12 phút", "45 giây" — cùng cách viết với email nhắc xem lại. */
export function formatVideoDuration(seconds: number | null | undefined): string | null {
  if (!seconds || seconds <= 0) return null;
  const s = Math.round(seconds);
  if (s < 60) return `${s} giây`;
  const minutes = Math.floor(s / 60);
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
}

export interface RecordingVideoOption {
  nodeId: number;
  title: string;
  /** "Chương 1 / Bài 2" — để phân biệt video trùng tên ở các thư mục khác nhau. */
  path: string;
  durationSeconds: number | null;
  bunnyStatus: BunnyVideoStatus | null;
  /** Video đã xử lý xong trên Bunny — BE chỉ nhận video FINISHED. */
  ready: boolean;
}

/** Mọi video trong cây khóa học, theo đúng thứ tự trang học. */
export function listCourseVideos(course: CourseDetail): RecordingVideoOption[] {
  return flattenTree(course, true)
    .filter((f) => f.node.fileKind === 'VIDEO')
    .map((f) => ({
      nodeId: f.node.id,
      title: f.node.title,
      path: f.pathTitles.join(' / '),
      durationSeconds: f.node.durationSeconds,
      bunnyStatus: f.node.bunnyStatus,
      ready: f.node.bunnyStatus === 'FINISHED',
    }));
}
