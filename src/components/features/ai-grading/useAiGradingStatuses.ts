'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { listAiGrading } from '@/actions/v1/ai-grading/get-ai-grading';
import type { AiGradingMode, AiGradingStatusRow } from '@/types/ai-grading';

/** Chu kỳ hỏi lại khi còn bài đang chạy. BE cho 120 req/phút/IP — 4 giây là ~15 req/phút. */
const POLL_MS = 4_000;
/** Lỗi mạng liên tiếp thì thưa ra thay vì dội request. */
const POLL_ERROR_MS = 15_000;

export interface AiGradingStatuses {
  /** studentId → trạng thái AI. Học sinh chưa từng chấm AI không có mục. */
  byStudent: ReadonlyMap<number, AiGradingStatusRow>;
  /** Số bài đang QUEUED / RUNNING. */
  inFlight: number;
  /** null cho tới khi tải xong lần đầu. */
  mode: AiGradingMode | null;
  /** Đã có phản hồi đầu tiên (kể cả rỗng). */
  loaded: boolean;
  /** Tải lại ngay — gọi sau khi vừa yêu cầu chấm để thấy trạng thái "đang chờ" liền. */
  refresh: () => Promise<void>;
}

/**
 * Theo dõi trạng thái AI chấm của một bài kiểm tra.
 *
 * Hỏi một lần lúc mở trang; sau đó chỉ hỏi lặp khi còn bài QUEUED/RUNNING và tab đang hiển
 * thị (tab ẩn thì dừng, hiện lại là hỏi ngay một lần rồi chạy tiếp). Hết bài đang chạy là tự
 * dừng — không có timer nào chạy nền khi không ai chấm.
 */
export function useAiGradingStatuses(testId: number, enabled: boolean): AiGradingStatuses {
  const [byStudent, setByStudent] = useState<ReadonlyMap<number, AiGradingStatusRow>>(
    () => new Map(),
  );
  const [inFlight, setInFlight] = useState(0);
  const [mode, setMode] = useState<AiGradingMode | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Chỉ một vòng hỏi tại một thời điểm; `generation` huỷ vòng cũ khi effect chạy lại.
  const timerRef = useRef<number | null>(null);
  const inFlightRef = useRef(0);
  const fetchingRef = useRef<Promise<void> | null>(null);
  const generationRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchOnce = useCallback(async (): Promise<boolean> => {
    const res = await listAiGrading(testId);
    if (!res.data) return false;
    const rows = res.data.data;
    inFlightRef.current = res.data.meta.inFlight;
    setByStudent(new Map(rows.map((r) => [r.studentId, r])));
    setInFlight(res.data.meta.inFlight);
    setMode(res.data.meta.mode);
    setLoaded(true);
    return true;
  }, [testId]);

  // `schedule` đệ quy qua ref để vòng lặp luôn dùng bản mới nhất mà không tạo timer đôi.
  const scheduleRef = useRef<(delay: number, generation: number) => void>(() => undefined);

  useEffect(() => {
    scheduleRef.current = (delay, generation) => {
      clearTimer();
      timerRef.current = window.setTimeout(async () => {
        timerRef.current = null;
        if (generation !== generationRef.current) return;
        if (document.visibilityState !== 'visible') return; // tab ẩn: dừng, visibilitychange sẽ đánh thức
        const ok = await fetchOnce().catch(() => false);
        if (generation !== generationRef.current) return;
        if (!ok) scheduleRef.current(POLL_ERROR_MS, generation);
        else if (inFlightRef.current > 0) scheduleRef.current(POLL_MS, generation);
      }, delay);
    };
  }, [clearTimer, fetchOnce]);

  useEffect(() => {
    if (!enabled) return;
    const generation = ++generationRef.current;
    scheduleRef.current(0, generation);

    function onVisibility() {
      if (document.visibilityState !== 'visible') return;
      // Hiện lại tab: hỏi ngay một lần (trạng thái có thể đã đổi lúc tab ẩn) rồi chạy tiếp.
      scheduleRef.current(0, generationRef.current);
    }
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      generationRef.current += 1;
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimer();
    };
  }, [enabled, testId, clearTimer]);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    // Hai lần bấm sát nhau dùng chung một request.
    fetchingRef.current ??= fetchOnce()
      .then(() => undefined)
      .catch(() => undefined)
      .finally(() => {
        fetchingRef.current = null;
      });
    await fetchingRef.current;
    // Vừa yêu cầu chấm mà còn bài đang chạy → đảm bảo vòng hỏi lặp đang chạy.
    if (inFlightRef.current > 0) scheduleRef.current(POLL_MS, generationRef.current);
  }, [enabled, fetchOnce]);

  return { byStudent, inFlight, mode, loaded, refresh };
}
