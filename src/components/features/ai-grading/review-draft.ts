import {
  MAX_REVIEW_NODES,
  MAX_REVIEW_TOPICS,
  MAX_REVIEW_TOPIC_LENGTH,
  type AiDraft,
  type ResolvedReviewSuggestions,
  type ReviewDraft,
  type ReviewSuggestionsPayload,
} from '@/types/ai-grading';

export const EMPTY_REVIEW: ReviewDraft = { topics: [], nodes: [] };

/** Gợi ý đã duyệt (BE đã ghép tên bài học hiện tại) → trạng thái sửa được trong form. */
export function reviewFromApproved(approved: ResolvedReviewSuggestions | null): ReviewDraft {
  if (!approved) return EMPTY_REVIEW;
  return {
    topics: approved.topics,
    nodes: approved.nodes.map((n) => ({
      nodeId: n.nodeId,
      title: n.title,
      fileKind: n.fileKind,
      reason: n.reason ?? '',
    })),
  };
}

/**
 * Đề xuất của AI → gợi ý ôn tập trong form. Bài học đã bị xoá (exists = false) bị bỏ: BE sẽ
 * từ chối lúc lưu nếu để lọt vào.
 */
export function reviewFromDraft(draft: AiDraft): ReviewDraft {
  const result = draft.result;
  if (!result) return EMPTY_REVIEW;
  return {
    topics: result.weakTopics.slice(0, MAX_REVIEW_TOPICS),
    nodes: result.recommendations
      .filter((r) => r.exists && r.title)
      .slice(0, MAX_REVIEW_NODES)
      .map((r) => ({
        nodeId: r.nodeId,
        title: r.title!,
        fileKind: r.fileKind,
        reason: r.reason,
      })),
  };
}

/** Rỗng → null để BE xoá cột (học sinh không còn thấy mục "Nội dung nên xem lại"). */
export function reviewToPayload(review: ReviewDraft): ReviewSuggestionsPayload | null {
  const topics = review.topics
    .map((t) => t.replace(/\s+/g, ' ').trim().slice(0, MAX_REVIEW_TOPIC_LENGTH))
    .filter(Boolean);
  const nodes = review.nodes.map((n) => ({
    nodeId: n.nodeId,
    ...(n.reason.trim() ? { reason: n.reason.trim() } : {}),
  }));
  return topics.length || nodes.length ? { topics, nodes } : null;
}
