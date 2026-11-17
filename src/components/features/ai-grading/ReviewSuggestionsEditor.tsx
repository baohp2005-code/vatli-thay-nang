'use client';

import { useState } from 'react';
import { FileText, Plus, PlayCircle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { handleActionErrors } from '@/lib/actions';
import { MAX_REVIEW_TOPICS, MAX_REVIEW_TOPIC_LENGTH, type ReviewDraft } from '@/types/ai-grading';

interface Props {
  value: ReviewDraft;
  onChange: (next: ReviewDraft) => void;
  disabled?: boolean;
}

/**
 * "Nội dung nên xem lại" — phần giáo viên DUYỆT trong form chấm: chủ đề yếu + bài học cùng
 * khóa. Học sinh chỉ thấy đúng những gì còn lại ở đây sau khi bấm Lưu điểm; gỡ từng mục được,
 * thêm chủ đề tự gõ được.
 */
export default function ReviewSuggestionsEditor({ value, onChange, disabled }: Props) {
  const [topicInput, setTopicInput] = useState('');

  function addTopic() {
    const topic = topicInput.replace(/\s+/g, ' ').trim();
    if (!topic) return;
    if (value.topics.some((t) => t.toLocaleLowerCase('vi') === topic.toLocaleLowerCase('vi'))) {
      setTopicInput('');
      return;
    }
    if (value.topics.length >= MAX_REVIEW_TOPICS) {
      return handleActionErrors([`Tối đa ${MAX_REVIEW_TOPICS} chủ đề`]);
    }
    onChange({ ...value, topics: [...value.topics, topic] });
    setTopicInput('');
  }

  const empty = value.topics.length === 0 && value.nodes.length === 0;

  return (
    <section className="space-y-2" aria-labelledby="review-editor-title">
      <div>
        <h3 id="review-editor-title" className="text-sm font-medium">
          Nội dung nên xem lại
        </h3>
        <p className="text-muted-foreground text-xs">
          Học sinh thấy mục này ở trang kết quả (và trong email báo điểm nếu bài bật email) sau khi
          bạn lưu điểm. Bỏ hết = không hiện.
        </p>
      </div>

      {empty && <p className="text-muted-foreground text-xs italic">Chưa có gợi ý nào.</p>}

      {value.topics.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Chủ đề nên ôn">
          {value.topics.map((topic) => (
            <li key={topic}>
              <Badge variant="default" className="gap-1 py-1 pr-1 text-xs">
                <span className="break-words">{topic}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onChange({ ...value, topics: value.topics.filter((t) => t !== topic) })
                  }
                  className="hover:bg-purple/20 focus-visible:ring-ring cursor-pointer rounded-full p-0.5 focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed"
                  aria-label={`Bỏ chủ đề ${topic}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {value.nodes.length > 0 && (
        <ul className="space-y-1.5" aria-label="Bài học nên xem lại">
          {value.nodes.map((node) => (
            <li
              key={node.nodeId}
              className="border-divider flex items-start gap-2 rounded-md border p-2 text-sm"
            >
              {node.fileKind === 'VIDEO' ? (
                <PlayCircle className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
              ) : (
                <FileText className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium break-words">{node.title}</p>
                {node.reason && (
                  <p className="text-muted-foreground text-xs break-words">{node.reason}</p>
                )}
              </div>
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                disabled={disabled}
                onClick={() =>
                  onChange({ ...value, nodes: value.nodes.filter((n) => n.nodeId !== node.nodeId) })
                }
                aria-label={`Bỏ bài học ${node.title}`}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="review-topic-input" className="text-xs">
            Thêm chủ đề
          </Label>
          <Input
            id="review-topic-input"
            value={topicInput}
            maxLength={MAX_REVIEW_TOPIC_LENGTH}
            disabled={disabled}
            placeholder="vd. Dao động điều hoà – pha ban đầu"
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTopic();
              }
            }}
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || !topicInput.trim()}
          onClick={addTopic}
          className="cursor-pointer"
        >
          <Plus /> Thêm
        </Button>
      </div>
    </section>
  );
}
