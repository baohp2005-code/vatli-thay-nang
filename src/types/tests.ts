/** Suy ra từ thời gian hiện tại ở BE — không lưu DB, FE chỉ đọc. */
export type TestPhase = 'SCHEDULED' | 'ONGOING' | 'ENDED';

/**
 * EXAM: bài kiểm tra — chấm điểm, có bước "Bắt đầu" + đồng hồ làm bài.
 * HOMEWORK: bài tập về nhà — chỉ cần nộp trước hạn, có email báo bài + nhắc hạn nộp.
 */
export type TestType = 'EXAM' | 'HOMEWORK';

export const TEST_TYPE_LABEL: Record<TestType, string> = {
  EXAM: 'Bài kiểm tra',
  HOMEWORK: 'Bài tập',
};

/** NOT_SUBMITTED suy ra khi học sinh chưa có bản ghi bài nộp. */
export type TestSubmissionStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'GRADED';

export interface TestFile {
  id?: number;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  order: number;
  /**
   * Có trong hai trường hợp: file ĐỀ BÀI trong response của ADMIN, và file BÀI LÀM của
   * CHÍNH học sinh đó. Cả hai đều vì cùng một lý do — form sửa gửi lên danh sách đầy đủ
   * và BE diff theo key, nên file giữ nguyên phải gửi lại key, không có thì mỗi lần sửa
   * là xoá sạch cái cũ.
   *
   * Học sinh KHÔNG nhận key file đề bài, và key bài làm của em ấy có dạng
   * `test-submissions/<testId>/<studentId>/…` — BE chốt quyền sở hữu bằng chính prefix
   * này lúc nhận bài, nên key của bạn khác khai vào cũng bị từ chối.
   */
  fileStorageKey?: string;
}

/**
 * Payload file gửi lên BE khi tạo/sửa đề bài hoặc nộp bài.
 *
 * KHÔNG có fileUrl: BE tự dựng từ fileStorageKey. Gửi kèm là bị 400
 * (forbidNonWhitelisted) — đừng thêm vào.
 */
export interface TestFilePayload {
  fileStorageKey: string;
  fileName: string;
  fileSize?: number;
  mimeType?: string;
  order: number;
}

export interface TestRow {
  id: number;
  title: string;
  startTime: string;
  endTime: string;
  maxScore: number;
  /** Thời gian làm bài (phút), đếm từ lúc học sinh bấm Bắt đầu. Bài tập: bỏ qua. */
  durationMinutes: number;
  type: TestType;
  phase: TestPhase;
}

/** Lượt làm bài của học sinh — trả từ getTest và POST /tests/:id/start. */
export interface TestAttempt {
  /** null khi được mở lại nộp bù mà chưa từng bấm Bắt đầu. */
  startedAt: string | null;
  /** Hạn nộp cá nhân = min(startedAt + durationMinutes, endTime), hoặc reopenUntil. */
  deadlineAt: string;
}

/** Danh sách bài kiểm tra — góc nhìn ADMIN (có số liệu lớp). */
export interface AdminTestRow extends TestRow {
  submissionCount: number;
  participantCount: number;
}

/** Danh sách bài kiểm tra — góc nhìn HỌC SINH (chỉ bài của mình). */
export interface StudentTestRow extends TestRow {
  mySubmissionStatus: TestSubmissionStatus;
  /** Có giá trị ngay khi bài đã được chấm (không chờ bài kết thúc). */
  myScore: number | null;
}

export interface TestDetail extends TestRow {
  courseId: number;
  /** BE trả null cho học sinh khi phase = SCHEDULED (đề có thể nằm trong mô tả). */
  description: string | null;
  /** BE trả [] cho học sinh khi phase = SCHEDULED. */
  attachments: TestFile[];
  /**
   * Chỉ có trong response của ADMIN / Trợ giảng. Bài tập: email báo bài mới + nhắc hạn nộp.
   * Bài kiểm tra: email báo điểm sau khi chấm.
   */
  emailNotify?: boolean;
}

/**
 * Email báo điểm gửi sau lần lưu điểm CUỐI bao nhiêu phút — khớp mặc định
 * TEST_SCORE_NOTIFY_DELAY_MINUTES phía BE. Chỉ dùng cho câu chữ hướng dẫn; mốc gửi thật
 * luôn lấy từ BE (`scoreEmail.at`, `scoreEmailAt`).
 */
export const SCORE_EMAIL_DELAY_MINUTES = 5;

/**
 * Email báo điểm của một học sinh (bảng chấm bài).
 * SCHEDULED: đang chờ tới `at` mới gửi — sửa điểm trước lúc đó thì học sinh chỉ nhận điểm mới.
 * PENDING / SENT / FAILED: email gần nhất đang gửi / đã gửi / gửi lỗi.
 */
export interface ScoreEmailStatus {
  state: 'SCHEDULED' | 'PENDING' | 'SENT' | 'FAILED';
  at: string | null;
  error: string | null;
  /** SCHEDULED và học sinh đã nhận email báo điểm trước đó → email sắp gửi là "cập nhật". */
  isUpdate: boolean;
}

/** Bài nộp của chính học sinh. `score`/`feedback` chỉ có khi ENDED + đã chấm (BE chốt). */
export interface MySubmission {
  note: string | null;
  submittedAt: string;
  updatedAt: string;
  files: TestFile[];
  score: number | null;
  feedback: string | null;
}

/** Lượt admin mở lại cho học sinh nộp bù — bỏ qua phase và đồng hồ làm bài. */
export interface TestReopen {
  reopenUntil: string;
  reason: string | null;
}

export interface StudentTestDetail extends TestDetail {
  /** null = chưa bấm Bắt đầu làm bài (khi đó đề bị giấu nếu bài đang mở). */
  myAttempt: TestAttempt | null;
  mySubmissionStatus: TestSubmissionStatus;
  myScore: number | null;
  /** null = chưa nộp bài nào. */
  mySubmission: MySubmission | null;
  /** Khác null = đang được mở lại nộp bù; hạn nộp là reopenUntil. */
  myReopen: TestReopen | null;
}

export interface SubmissionRow {
  studentId: number;
  fullName: string | null;
  email: string;
  status: TestSubmissionStatus;
  submittedAt: string | null;
  updatedAt: string | null;
  score: number | null;
  feedback: string | null;
  note: string | null;
  files: TestFile[];
  /** Đã bị thu hồi ghi danh nhưng còn bài nộp — không tính vào stats. */
  leftCourse: boolean;
  /** Lượt mở lại đang cấp; null = không có. Đã nộp bài thì luôn null. */
  reopen: TestReopen | null;
  /** Email báo điểm gần nhất / đang chờ gửi; null = chưa có. */
  scoreEmail?: ScoreEmailStatus | null;
}

export interface ScoreBin {
  from: number;
  to: number;
  count: number;
}

export interface TestStats {
  participantCount: number;
  submittedCount: number;
  gradedCount: number;
  avg: number | null;
  min: number | null;
  max: number | null;
  distribution: ScoreBin[];
}

/** Danh sách bạn học phía học sinh — CHỈ tên + đã/chưa nộp, không bao giờ có điểm. */
export interface ParticipantRow {
  fullName: string | null;
  hasSubmitted: boolean;
}

export interface ParticipantsResult {
  data: ParticipantRow[];
  meta: PageMeta;
  myScore: number | null;
  /** null khi chưa hết giờ HOẶC chưa đủ số bài đã chấm (ẩn danh). */
  distribution: ScoreBin[] | null;
  gradedCount: number | null;
  minGradedForDistribution: number;
}

export interface PageMeta {
  total: number;
  page: number;
  pageSize: number;
}

export type SubmissionFilterStatus = 'submitted' | 'graded' | 'not_submitted';
export type ExportFormat = 'csv' | 'xlsx';
