const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export function formatDateTime(iso: string | Date): string {
  return new Date(iso).toLocaleString('vi-VN', {
    timeZone: VN_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string | Date | null | undefined, fallback = '—'): string {
  if (iso === null || iso === undefined || iso === '') return fallback;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('vi-VN', {
    timeZone: VN_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTimeShort(iso: string | Date): string {
  return new Date(iso).toLocaleString('vi-VN', {
    timeZone: VN_TIME_ZONE,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** "HH:mm" theo giờ VN. */
export function formatTime(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString('vi-VN', {
    timeZone: VN_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Ngày (YYYY-MM-DD) theo giờ VN của một mốc thời gian.
 *
 * Không dùng getFullYear/getMonth/getDate (giờ máy) rồi toISOString (UTC) như trước:
 * cách đó vừa lệch múi ở chính máy đang chạy, vừa cho ra hai kết quả khác nhau giữa
 * SSR (Vercel chạy UTC) và trình duyệt (UTC+7) — tức là hydration mismatch ngay trên
 * một <input type="date">. en-CA cho sẵn định dạng YYYY-MM-DD.
 */
function vnDateISO(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: VN_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function firstOfMonthISO(): string {
  return `${vnDateISO(new Date()).slice(0, 8)}01`;
}

export function todayISO(): string {
  return vnDateISO(new Date());
}

export function formatBytes(n?: number | null): string {
  if (!n || n <= 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

export function formatVnd(v: number | null | undefined): string {
  if (!v || v <= 0) return 'Miễn phí';
  return `${v.toLocaleString('vi-VN')} đ`;
}

/**
 * Số tiền VND cho bảng/biểu mẫu quản trị.
 *
 * Khác `formatVnd` (dùng cho giá khoá học, coi 0 là "Miễn phí"): ở bảng học phí
 * `0 đ` là một giá trị có nghĩa — "chưa đóng đồng nào" — không được nuốt mất.
 */
export function formatAmountVnd(v: number | null | undefined): string {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : 0;
  return `${n.toLocaleString('vi-VN')} đ`;
}

/**
 * Số tiền VND rút gọn cho trục chart ("1.2tr", "850k") — `formatAmountVnd` đầy
 * đủ quá dài để làm tick label, đặc biệt khi có nhiều tháng trên trục X.
 */
export function formatCompactVnd(v: number | null | undefined): string {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : 0;
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} tỷ`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}tr`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

/** Nhãn tháng ngắn cho trục chart/badge, ví dụ (2026, 7) -> "07/26". */
export function shortMonthLabel(year: number, month: number): string {
  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
}

/** (year, month) lùi/tiến `delta` tháng — dùng chung cho MonthPicker và mặc định khoảng chart. */
export function shiftMonth(
  year: number,
  month: number,
  delta: number,
): { year: number; month: number } {
  const zeroBased = year * 12 + (month - 1) + delta;
  return { year: Math.floor(zeroBased / 12), month: (zeroBased % 12) + 1 };
}

/**
 * ISO datetime → value cho <input type="date"> theo giờ VN.
 *
 * KHÔNG dùng `iso.slice(0, 10)` hay `toISOString()`: mốc 01/03 00:00 giờ VN là
 * `2025-02-28T17:00:00Z`, cắt chuỗi UTC ra 28/02 — lệch 1 ngày, và lệch KHÁC NHAU
 * giữa SSR (Vercel chạy UTC) với trình duyệt (UTC+7) → React #418 (xem doc ở vnDateISO).
 */
export function toDateInputValue(iso: string | Date | null | undefined): string {
  if (iso === null || iso === undefined || iso === '') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return vnDateISO(d);
}

/**
 * Năm/tháng hiện tại theo giờ VN.
 * Chỉ gọi ở RSC (`page.tsx`) rồi truyền xuống props — gọi trong client component
 * sẽ cho kết quả khác server ở ranh giới tháng.
 */
export function vnCurrentYearMonth(): { year: number; month: number } {
  const [y, m] = vnDateISO(new Date()).split('-');
  return { year: Number(y), month: Number(m) };
}

export function daysLeftInCurrentVietnamMonth(): number {
  const [y, m, d] = vnDateISO(new Date()).split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  return daysInMonth - d + 1;
}

// TODO tạm để 20 cho dễ test UI — trả lại 7 khi xong.
const TUITION_REMINDER_DAYS_LEFT = 20;

/**
 * Tháng cần nhắc đóng học phí (không null khi còn <= N ngày cuối tháng),
 * hoặc null nếu chưa tới hạn. Chỉ gọi ở RSC, cùng lý do với `vnCurrentYearMonth`.
 */
export function getTuitionReminderMonth(): { year: number; month: number } | null {
  return daysLeftInCurrentVietnamMonth() <= TUITION_REMINDER_DAYS_LEFT
    ? vnCurrentYearMonth()
    : null;
}
