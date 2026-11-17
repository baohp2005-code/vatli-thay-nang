'use client';

import Link from 'next/link';
import { BookOpenCheck, FileText, PlayCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ResolvedReviewSuggestions } from '@/types/ai-grading';

/**
 * "Nội dung nên xem lại" ở trang kết quả của học sinh: chủ đề còn yếu + link mở thẳng bài
 * giảng / tài liệu cùng khóa. Đây là gợi ý giáo viên ĐÃ DUYỆT khi lưu điểm (không phải bản
 * nháp AI) — BE chỉ trả khi bài đã chấm, và đã bỏ bài học bị xoá.
 */
export default function ReviewSuggestionsCard({
  courseId,
  suggestions,
}: {
  courseId: number;
  suggestions: ResolvedReviewSuggestions | null | undefined;
}) {
  if (!suggestions || (suggestions.topics.length === 0 && suggestions.nodes.length === 0)) {
    return null;
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4 sm:py-6">
        <p className="flex items-center gap-2 text-sm font-medium">
          <BookOpenCheck className="text-purple size-4" aria-hidden />
          Nội dung nên xem lại
        </p>

        {suggestions.topics.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs">Chủ đề cần ôn</p>
            <ul className="flex flex-wrap gap-1.5">
              {suggestions.topics.map((topic) => (
                <li key={topic}>
                  <Badge variant="default" className="text-xs">
                    {topic}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        {suggestions.nodes.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-xs">Bài học nên xem</p>
            <ul className="space-y-1.5">
              {suggestions.nodes.map((node) => (
                <li key={node.nodeId}>
                  <Link
                    // tab=content: trang học mặc định mở cây nội dung; item = id bài học.
                    href={`/dashboard/courses/${courseId}/learn?tab=content&item=${node.nodeId}`}
                    className="hover:bg-muted focus-visible:ring-ring border-divider flex items-start gap-2.5 rounded-md border p-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {node.fileKind === 'VIDEO' ? (
                      <PlayCircle className="text-purple mt-0.5 size-4 shrink-0" aria-hidden />
                    ) : (
                      <FileText className="text-purple mt-0.5 size-4 shrink-0" aria-hidden />
                    )}
                    <span className="min-w-0">
                      <span className="block font-medium break-words">{node.title}</span>
                      <span className="text-muted-foreground block text-xs">
                        {node.fileKind === 'VIDEO' ? 'Video bài giảng' : 'Tài liệu'}
                        {node.reason && ` · ${node.reason}`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
