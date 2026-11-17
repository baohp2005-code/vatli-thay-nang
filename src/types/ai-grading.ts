/**
 * AI chấm bài kiểm tra — hình dạng dữ liệu BE trả (GET/POST /api/v1/tests/:id/ai-grading…).
 *
 * Bản nháp AI CHỈ dành cho admin / trợ giảng: học sinh không có route nào tới đây. Thứ học
 * sinh nhìn thấy là `ResolvedReviewSuggestions` — gợi ý ôn tập giáo viên ĐÃ DUYỆT.
 */

export type AiGradingStatus = 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED';
export type AiConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

/** openai = gọi thật · stub = bản nháp giả lập (server chưa có key) · disabled = production chưa có key. */
export type AiGradingMode = 'openai' | 'stub' | 'disabled';

export type CourseFileKind = 'VIDEO' | 'DOCUMENT';

/** Một dòng trạng thái (danh sách nhẹ, gọi lặp khi có bài đang chạy). */
export interface AiGradingStatusRow {
  studentId: number;
  status: AiGradingStatus;
  error: string | null;
  /** Chỉ có khi status = DONE. */
  suggestedScore: number | null;
  confidence: AiConfidence | null;
  usedAnswerKey: boolean;
  /** Bài đã nộp lại sau khi AI chấm — bản nháp không còn khớp bài làm hiện tại. */
  stale: boolean;
  finishedAt: string | null;
  updatedAt: string;
}

export interface AiGradingListResult {
  data: AiGradingStatusRow[];
  meta: { inFlight: number; mode: AiGradingMode };
}

export interface AiQuestionResult {
  label: string;
  /** null = đề / barem không ghi thang điểm cho câu này. */
  maxPoints: number | null;
  awardedPoints: number;
  comment: string;
}

export interface AiRecommendation {
  nodeId: number;
  reason: string;
  /** Tên hiện tại của bài học; null khi bài đã bị xoá (exists = false). */
  title: string | null;
  fileKind: CourseFileKind | null;
  exists: boolean;
}

export interface AiFileUsage {
  section: 'QUESTION' | 'ANSWER_KEY' | 'SUBMISSION';
  fileName: string;
  sent: boolean;
  reason: string | null;
}

export interface AiDraftResult {
  questions: AiQuestionResult[];
  mistakes: string[];
  weakTopics: string[];
  recommendations: AiRecommendation[];
  confidence: AiConfidence;
  notes: string[];
  suspiciousContent: boolean;
  modelTotalScore: number | null;
  files: AiFileUsage[];
}

export interface AiDraft {
  status: AiGradingStatus;
  error: string | null;
  /** false = AI tự giải đề (không có đáp án) → độ tin cậy thấp hơn. */
  usedAnswerKey: boolean;
  model: string | null;
  stale: boolean;
  suggestedScore: number | null;
  feedback: string | null;
  result: AiDraftResult | null;
  requestedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

/** Gợi ý ôn tập đã duyệt, ghép với tên / loại bài học hiện tại (bài đã xoá bị BE bỏ). */
export interface ResolvedReviewSuggestions {
  topics: string[];
  nodes: Array<{
    nodeId: number;
    title: string;
    fileKind: CourseFileKind | null;
    reason: string | null;
  }>;
}

export interface AiDraftDetail {
  /** Bản nháp AI; null = chưa từng chấm bằng AI. */
  draft: AiDraft | null;
  /** Gợi ý ôn tập đang được duyệt cho bài này (học sinh đang thấy cái này). */
  approved: ResolvedReviewSuggestions | null;
}

/** Kết quả "Chấm cả lớp bằng AI". */
export interface AiBulkResult {
  queued: number;
  inFlight: number;
  fresh: number;
  failed: number;
  /** Bài vượt trần một lần bấm — bấm lại để chấm tiếp. */
  overLimit: number;
}

/** Gợi ý ôn tập trong form chấm — thứ giáo viên đang sửa trước khi lưu. */
export interface ReviewDraftNode {
  nodeId: number;
  title: string;
  fileKind: CourseFileKind | null;
  reason: string;
}

export interface ReviewDraft {
  topics: string[];
  nodes: ReviewDraftNode[];
}

/** Payload gửi kèm lúc lưu điểm (PATCH .../grade). null = xoá hết gợi ý đã duyệt. */
export interface ReviewSuggestionsPayload {
  topics: string[];
  nodes: Array<{ nodeId: number; reason?: string }>;
}

/** Trần BE (review-suggestions.dto) — để form chặn trước khi gửi. */
export const MAX_REVIEW_TOPICS = 10;
export const MAX_REVIEW_NODES = 10;
export const MAX_REVIEW_TOPIC_LENGTH = 100;
