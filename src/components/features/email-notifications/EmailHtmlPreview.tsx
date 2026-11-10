'use client';

interface Props {
  html: string;
  title: string;
}

/**
 * Hiển thị email đúng như học sinh nhận. `sandbox` rỗng: không chạy script, không điều
 * hướng trang admin — nội dung có chữ người dùng nhập (đã escape ở BE, nhưng cứ chặn).
 * Nền trắng cố định vì email được thiết kế cho nền trắng, kể cả khi admin dùng dark mode.
 */
export default function EmailHtmlPreview({ html, title }: Props) {
  return (
    <iframe
      title={title}
      srcDoc={html}
      sandbox=""
      className="h-[60vh] w-full rounded-md border bg-white"
    />
  );
}
