import { redirect } from 'next/navigation';
import Image from 'next/image';
import {
  Users,
  School,
  LayoutDashboard,
  Wallet,
  BookOpen,
  GraduationCap,
  UserRound,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/app/PageHeader';
import { getCurrentSession } from '@/lib/server/session';
import HelpSections, { type HelpSectionData } from './HelpSections';
import { cn } from '@/lib/utils';

// Ảnh minh họa lưu trên R2 (không commit lên GitHub) — xem scripts/upload lúc tạo.
const HELP_IMG_BASE = 'https://pub-d15f1310dee646d49a73d9b8ad27a2b5.r2.dev/help';

interface ShotProps {
  src: string;
  w: number;
  h: number;
  alt: string;
  /** Ảnh đứng riêng 1 mình thu nhỏ lại cho gọn; ảnh trong lưới 2 cột giữ full bề rộng ô. */
  size?: 'default' | 'full';
}

function Shot({ src, w, h, alt, size = 'default' }: ShotProps) {
  return (
    <Image
      src={`${HELP_IMG_BASE}/${src}`}
      alt={alt}
      width={w}
      height={h}
      className={cn(
        'border-divider rounded-lg border',
        size === 'full' ? 'w-full' : 'w-full max-w-4xl',
      )}
    />
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="bg-primary text-primary-foreground mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
        {n}
      </span>
      <div className="min-w-0 flex-1 space-y-3 text-sm leading-relaxed">{children}</div>
    </li>
  );
}

function Section({
  id,
  icon: Icon,
  title,
  intro,
  children,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={id}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="text-muted-foreground size-5" />
          {title}
        </CardTitle>
        <p className="text-muted-foreground text-sm">{intro}</p>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4 sm:space-y-6">{children}</ol>
      </CardContent>
    </Card>
  );
}

export default async function AdminHelpPage() {
  const session = await getCurrentSession();
  if (session?.role === 'TEACHING_ASSISTANT') redirect('/admin/classes');

  const sections: HelpSectionData[] = [
    {
      id: 'nguoi-dung',
      content: (
        <Section
          id="nguoi-dung"
          icon={Users}
          title="Người dùng"
          intro="Quản lý toàn bộ tài khoản trong hệ thống — cả quản trị viên và học sinh."
        >
          <Step n={1}>
            <p>
              Card <strong>&quot;Bộ lọc&quot;</strong> tìm theo Email, Họ và tên, Giới tính, Tỉnh,
              Trường, SĐT phụ huynh, Vai trò, Trạng thái hoặc Lớp học — bấm{' '}
              <strong>&quot;Tìm kiếm&quot;</strong> để lọc, <strong>&quot;Xoá bộ lọc&quot;</strong>{' '}
              để xem lại tất cả.
            </p>
            <Shot
              src="nguoi-dung/01-tong-quan.png"
              w={1280}
              h={900}
              alt="Bộ lọc và nút Tạo / Đồng bộ user"
            />
          </Step>
          <Step n={2}>
            <p>
              Bấm <strong>&quot;Tạo / Đồng bộ user&quot;</strong> → tab{' '}
              <strong>&quot;Tạo 1 user&quot;</strong>: nhập email rồi bấm{' '}
              <strong>&quot;Tạo tài khoản&quot;</strong> — hệ thống tự gửi mail kích hoạt, học sinh
              tự đặt mật khẩu lần đầu khi mở link trong mail.
            </p>
            <Shot src="nguoi-dung/02-tao-1-user.png" w={1280} h={900} alt="Tạo 1 user bằng email" />
          </Step>
          <Step n={3}>
            <p>
              Tab <strong>&quot;Đồng bộ CSV&quot;</strong>: chọn file .csv 2 cột{' '}
              <code className="bg-muted rounded px-1 py-0.5 text-xs">email,status</code> (
              <code className="bg-muted rounded px-1 py-0.5 text-xs">active</code> = kích hoạt,{' '}
              <code className="bg-muted rounded px-1 py-0.5 text-xs">inactive</code> = vô hiệu hoá)
              để xử lý hàng loạt nhiều tài khoản cùng lúc. Tài khoản chưa có sẽ được tạo mới, tài
              khoản đã có sẽ đổi trạng thái theo file — theo dõi tiến trình qua thanh progress.
            </p>
            <Shot
              src="nguoi-dung/03-dong-bo-csv.png"
              w={1280}
              h={900}
              alt="Đồng bộ tài khoản bằng CSV"
            />
          </Step>
          <Step n={4}>
            <p>
              Cột <strong>&quot;Mail kích hoạt&quot;</strong> cho biết đã từng gửi mail kích hoạt
              cho tài khoản đó chưa và gửi lúc nào. Nút hành động ở cuối dòng đổi theo trạng thái:{' '}
              <strong>&quot;Gửi mail kích hoạt&quot;</strong> (chưa từng gửi) →{' '}
              <strong>&quot;Đã gửi&quot;</strong> (vừa gửi, mail còn hiệu lực — nút tạm khoá để
              tránh gửi chồng làm hỏng link cũ) → tự bật lại thành{' '}
              <strong>&quot;Gửi lại&quot;</strong> khi link cũ hết hạn. Với tài khoản đã kích hoạt:{' '}
              <strong>&quot;Vô hiệu hóa&quot;</strong> ↔ <strong>&quot;Kích hoạt lại&quot;</strong>.
            </p>
            <Shot
              src="nguoi-dung/04-hanh-dong-dong-bo.png"
              w={1280}
              h={900}
              alt="Cột mail kích hoạt và nút đổi trạng thái tài khoản theo từng dòng"
            />
          </Step>
          <Step n={5}>
            <p>
              Nút <strong>&quot;Sửa&quot;</strong> mở hộp thoại chỉnh thông tin cá nhân (họ tên,
              giới tính, ngày sinh, tỉnh, trường, SĐT phụ huynh, Facebook) — email và mật khẩu không
              đổi được ở đây. Nút <strong>&quot;Xoá&quot;</strong> chỉ có trên tài khoản học sinh và
              xoá vĩnh viễn tài khoản cùng dữ liệu học tập, học phí, điểm danh, tiến độ và bài làm
              của học sinh đó.
            </p>
            <Shot
              src="nguoi-dung/05-sua-xoa.png"
              w={1280}
              h={900}
              alt="Hộp thoại sửa thông tin và xác nhận xoá tài khoản"
            />
          </Step>
          <Step n={6}>
            <p>
              Tick chọn nhiều dòng (hoặc tick ô đầu bảng để chọn tất cả) rồi bấm{' '}
              <strong>&quot;Xoá đã chọn&quot;</strong> để xoá hàng loạt cùng lúc. Mỗi tài khoản được
              xét độc lập — học sinh được xoá cùng dữ liệu liên quan; tài khoản không phải học sinh,
              tài khoản đang thao tác hoặc không còn tồn tại sẽ tự động bị bỏ qua.
            </p>
            <Shot
              src="nguoi-dung/06-xoa-hang-loat.png"
              w={1280}
              h={900}
              alt="Chọn nhiều dòng và xoá hàng loạt tài khoản"
            />
          </Step>
        </Section>
      ),
    },
    {
      id: 'lop-hoc',
      content: (
        <Section
          id="lop-hoc"
          icon={School}
          title="Lớp học"
          intro="Quản lý lớp học, học sinh trong lớp và buổi học của từng lớp."
        >
          <Step n={1}>
            <p>
              Card <strong>&quot;Tải điểm danh nhiều lớp&quot;</strong> xuất báo cáo điểm danh gộp
              nhiều lớp theo khoảng ngày (CSV/Excel). Card <strong>&quot;Bộ lọc&quot;</strong> tìm
              theo tên/mã lớp, trạng thái, ngày tạo. Bấm <strong>&quot;Tạo lớp&quot;</strong> để tạo
              lớp mới.
            </p>
            <Shot src="lop-hoc/01-danh-sach.png" w={1280} h={900} alt="Danh sách lớp học" />
          </Step>
          <Step n={2}>
            <p>
              Form <strong>&quot;Tạo lớp&quot;</strong>: Tên lớp, Mã lớp (bắt buộc), Mô tả, và{' '}
              <strong>Học phí / tháng</strong> — mức thu cố định mỗi tháng cho học sinh đang theo
              học, tính theo THÁNG chứ không nhân theo số buổi: tháng nào lớp có ít nhất 1 buổi học
              thì tính đủ một tháng, tháng không có buổi nào thì không tính tiền. Muốn miễn giảm hay
              có ngoại lệ cho một học sinh cụ thể thì sửa tay trực tiếp ở bảng học phí (mục{' '}
              <strong>Học phí</strong>).
            </p>
            <p>
              Tick <strong>&quot;Gửi email kết quả điểm danh cho học sinh&quot;</strong> nếu muốn
              sau mỗi buổi học, từng học sinh của lớp nhận email báo có mặt / vắng có phép / vắng
              không phép (mặc định tắt; bật hoặc tắt lại bất cứ lúc nào qua nút <strong>Sửa</strong>
              ).
            </p>
            <Shot src="lop-hoc/02-tao-lop.png" w={1280} h={900} alt="Form tạo lớp" />
          </Step>
          <Step n={3}>
            <p>
              Ở mỗi dòng lớp: icon <strong>Học phí</strong> (đi thẳng tới trang học phí của lớp),
              icon <strong>Sửa</strong>, icon <strong>Xoá</strong> (chỉ hiện khi lớp đã đóng). Click
              vào tên lớp để mở trang chi tiết.
            </p>
            <Shot
              src="lop-hoc/03-hanh-dong-dong.png"
              w={1280}
              h={900}
              alt="Các nút hành động trên một dòng lớp"
            />
          </Step>
          <Step n={4}>
            <p>
              Trang chi tiết lớp có 3 tab: <strong>Thông tin</strong> / <strong>Học sinh</strong> /{' '}
              <strong>Buổi học</strong>. Tab Thông tin hiển thị tên, mã, trạng thái, học phí theo
              tháng, ngày tạo, mô tả của lớp.
            </p>
            <Shot src="lop-hoc/04-tab-thong-tin.png" w={1280} h={900} alt="Tab Thông tin của lớp" />
          </Step>
          <Step n={5}>
            <p>
              Tab <strong>Học sinh</strong>: tìm theo email/họ tên; bấm{' '}
              <strong>&quot;Thêm học sinh&quot;</strong> để mở danh sách toàn bộ học sinh trong hệ
              thống, tick chọn nhiều em rồi bấm <strong>&quot;Thêm&quot;</strong> — học sinh đã có
              trong lớp sẽ tự ẩn khỏi danh sách chọn.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Shot
                src="lop-hoc/05-tab-hoc-sinh.png"
                w={1280}
                h={900}
                alt="Tab Học sinh của lớp"
                size="full"
              />
              <Shot
                src="lop-hoc/06-them-hoc-sinh-dialog.png"
                w={1280}
                h={900}
                alt="Hộp thoại thêm học sinh vào lớp"
                size="full"
              />
            </div>
          </Step>
          <Step n={6}>
            <p>
              Tab <strong>Buổi học</strong>: bấm <strong>&quot;Tạo buổi học&quot;</strong> — nhập
              Tiêu đề, Bắt đầu/Kết thúc (bắt buộc), Mô tả, Link meeting. Học phí không đặt riêng
              theo buổi nữa — hễ tháng đó có buổi học là tính đủ học phí theo tháng của lớp. Nút{' '}
              <strong>&quot;Xuất điểm danh&quot;</strong> xuất báo cáo điểm danh của riêng lớp này.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Shot
                src="lop-hoc/07-tab-buoi-hoc.png"
                w={1280}
                h={900}
                alt="Tab Buổi học của lớp"
                size="full"
              />
              <Shot
                src="lop-hoc/08-tao-buoi-hoc-dialog.png"
                w={1280}
                h={900}
                alt="Hộp thoại tạo buổi học"
                size="full"
              />
            </div>
          </Step>
        </Section>
      ),
    },
    {
      id: 'buoi-hoc',
      content: (
        <Section
          id="buoi-hoc"
          icon={LayoutDashboard}
          title="Buổi học"
          intro="Tổng hợp buổi học của tất cả lớp, và là nơi bật điểm danh / theo dõi điểm danh cho từng buổi."
        >
          <Step n={1}>
            <p>
              Trang danh sách lọc theo mã lớp và khoảng ngày; bấm{' '}
              <strong>&quot;Tạo buổi học&quot;</strong> để tạo cho lớp bất kỳ (chọn lớp ngay trong
              form). Click 1 dòng để vào trang chi tiết buổi học đó.
            </p>
            <Shot
              src="buoi-hoc/01-danh-sach.png"
              w={1280}
              h={900}
              alt="Danh sách buổi học trên mọi lớp"
            />
          </Step>
          <Step n={2}>
            <p>
              Trang chi tiết hiển thị thông tin buổi và{' '}
              <strong>&quot;Báo cáo tổng quan&quot;</strong> (tổng học sinh / đã điểm danh / chưa
              điểm danh / xin nghỉ), có thể bấm <strong>&quot;Xuất Excel&quot;</strong> để xuất báo
              cáo này. Nút <strong>&quot;Bật điểm danh&quot;</strong> chỉ xuất hiện khi buổi học
              đang diễn ra.
            </p>
            <Shot
              src="buoi-hoc/02-chi-tiet-tong-quan.png"
              w={1280}
              h={1000}
              alt="Thông tin buổi học và báo cáo tổng quan"
            />
          </Step>
          <Step n={3}>
            <p>
              Bấm <strong>&quot;Bật điểm danh&quot;</strong> → chọn thời lượng tính bằng phút (có
              sẵn nút bấm nhanh 5/10/15/20 phút) → <strong>&quot;Xác nhận&quot;</strong> — mở một
              &quot;phiên điểm danh&quot; để học sinh tự check-in trong đúng khoảng thời gian đó.
            </p>
            <Shot
              src="buoi-hoc/03-bat-diem-danh-dialog.png"
              w={1280}
              h={1000}
              alt="Hộp thoại bật điểm danh"
            />
          </Step>
          <Step n={4}>
            <p>
              <strong>&quot;Bảng tổng hợp điểm danh&quot;</strong>: mỗi phiên điểm danh là một cột
              riêng (có mặt hay không + giờ điểm danh). Tick chọn học sinh rồi bấm{' '}
              <strong>&quot;Đánh dấu có mặt&quot;</strong> /{' '}
              <strong>&quot;Huỷ điểm danh&quot;</strong> để điểm danh thủ công — dùng khi học sinh
              quên check-in hoặc điểm danh nhầm. Có thể làm riêng cho 1 học sinh qua menu{' '}
              <strong>&quot;…&quot;</strong> ở cuối dòng.
            </p>
            <Shot
              src="buoi-hoc/04-bang-tong-hop.png"
              w={1280}
              h={1000}
              alt="Bảng tổng hợp điểm danh"
            />
          </Step>
          <Step n={5}>
            <p>
              <strong>&quot;Danh sách xin nghỉ&quot;</strong>: các đơn xin nghỉ học sinh gửi cho
              buổi này (Cả buổi / Rời sớm). Đơn có hiệu lực ngay, không cần duyệt; học sinh chỉ gửi
              hoặc sửa được đơn trước khi buổi học kết thúc. Buổi nghỉ có phép vẫn tính học phí như
              thường, hệ thống không tự điểm danh cho buổi đó.
            </p>
            <Shot
              src="buoi-hoc/05-yeu-cau-nghi.png"
              w={1600}
              h={900}
              alt="Danh sách xin nghỉ của buổi học"
            />
          </Step>
          <Step n={6}>
            <p>
              Thẻ <strong>&quot;Email kết quả điểm danh&quot;</strong> (khi lớp đã bật gửi email):
              buổi học có mở điểm danh sẽ được hệ thống tự gửi email khoảng 30 phút sau giờ kết thúc
              — khoảng chờ để kịp sửa điểm danh thủ công. Muốn gửi sớm hơn thì bấm{' '}
              <strong>&quot;Gửi ngay&quot;</strong> sau khi buổi học kết thúc.
            </p>
            <p>
              Sau khi gửi, thẻ hiện số email đã gửi / lỗi. Nếu sửa điểm danh của học sinh nào sau
              khi đã gửi, thẻ báo <strong>&quot;Có thay đổi sau khi gửi&quot;</strong> — bấm{' '}
              <strong>&quot;Gửi lại cho … học sinh có thay đổi&quot;</strong> để các em nhận kết quả
              đúng; email lỗi (hết hạn mức gửi, địa chỉ sai…) gửi lại bằng nút{' '}
              <strong>&quot;Gửi lại email lỗi&quot;</strong>.
            </p>
          </Step>
        </Section>
      ),
    },
    {
      id: 'hoc-phi',
      content: (
        <Section
          id="hoc-phi"
          icon={Wallet}
          title="Học phí"
          intro="Theo dõi và thu học phí theo tháng, cho từng lớp hoặc toàn bộ hệ thống."
        >
          <Step n={1}>
            <p>
              Trang tổng quan lọc theo lớp và khoảng tháng (tối đa 16 tháng) — 4 thẻ tổng (phải thu
              / đã thu / còn thiếu / tỷ lệ thu) và 2 biểu đồ xu hướng theo tháng luôn tính trên TOÀN
              BỘ hệ thống, không đổi theo lớp đang lọc ở bảng dưới.
            </p>
            <Shot
              src="hoc-phi/01-tong-quan-bo-loc.png"
              w={1280}
              h={1000}
              alt="Bộ lọc và thẻ tổng quan học phí"
            />
          </Step>
          <Step n={2}>
            <p>
              Bảng <strong>&quot;Danh sách các lớp&quot;</strong> cho biết số học sinh, số học sinh
              đã đóng xong, học phí yêu cầu/thu được của từng lớp trong tháng đang xem. Chỉ bật được{' '}
              <strong>&quot;Xuất Excel&quot;</strong> / <strong>&quot;Nhập Excel&quot;</strong> khi
              đã chọn một lớp cụ thể ở bộ lọc &quot;Lớp&quot; ngay tại bảng này. Click mã lớp hoặc
              tên lớp để vào trang chi tiết.
            </p>
            <Shot
              src="hoc-phi/03-tong-quan-bang-lop.png"
              w={1280}
              h={1000}
              alt="Biểu đồ xu hướng và bảng danh sách các lớp"
            />
          </Step>
          <Step n={3}>
            <p>
              Trang chi tiết 1 lớp có 5 thẻ thống kê của tháng đang xem, đổi tháng bằng bộ lọc phía
              trên, và 2 nút: <strong>&quot;Xuất Excel&quot;</strong>,{' '}
              <strong>&quot;Nhập Excel&quot;</strong>. Học phí phải đóng của các dòng CHƯA từng sửa
              tay được hệ thống <strong>tự động đồng bộ mỗi khi mở trang</strong> theo học phí/tháng
              hiện tại của lớp — không cần bấm nút nào; số đã thu, ngày đóng, ghi chú không bị đụng
              tới.
            </p>
            <Shot
              src="hoc-phi/04-chi-tiet-bo-loc.png"
              w={1280}
              h={1000}
              alt="Trang chi tiết học phí của một lớp"
            />
          </Step>
          <Step n={4}>
            <p>
              Sửa trực tiếp trong bảng: đổi &quot;Đã đóng&quot; / &quot;Ngày đóng&quot; / &quot;Ghi
              chú&quot; ở từng dòng rồi bấm <strong>&quot;Lưu&quot;</strong> riêng dòng đó, hoặc sửa
              nhiều dòng cùng lúc rồi bấm <strong>&quot;Lưu tất cả&quot;</strong> ở góc bảng để lưu
              một lần. Cột <strong>&quot;Sửa tay lúc&quot;</strong> cho biết dòng nào từng được sửa
              tay và sửa lúc nào — các dòng này sẽ KHÔNG bị hệ thống tự động ghi đè khi học phí lớp
              thay đổi. Đổi tháng khi còn dòng chưa lưu sẽ mất các thay đổi này — hệ thống cảnh báo
              trước khi cho phép tiếp tục.
            </p>
            <Shot
              src="hoc-phi/05-bang-luu-tung-dong.png"
              w={1280}
              h={1000}
              alt="Sửa và lưu bảng học phí, cột Sửa tay lúc"
            />
          </Step>
          <Step n={5}>
            <p>
              <strong>&quot;Xuất Excel&quot;</strong>: chọn xuất theo tháng đang xem hoặc theo một
              dải buổi cụ thể, rồi bấm <strong>&quot;Tải xuống&quot;</strong>. Trong file, cột mỗi
              buổi học: <code className="bg-muted rounded px-1 py-0.5 text-xs">x</code> = có điểm
              danh, để trống = chưa điểm danh — buổi nghỉ phép vẫn tính tiền như thường nhưng KHÔNG
              đánh dấu <code className="bg-muted rounded px-1 py-0.5 text-xs">x</code>, ghi thêm lý
              do vào cột &quot;Ghi chú&quot; nếu cần lưu lại.
            </p>
            <Shot
              src="hoc-phi/06-xuat-dialog.png"
              w={1280}
              h={900}
              alt="Hộp thoại xuất Excel học phí"
            />
          </Step>
          <Step n={6}>
            <p>
              <strong>&quot;Nhập Excel&quot;</strong>: nếu chưa có file, bấm{' '}
              <strong>&quot;Tải mẫu&quot;</strong> để tải đúng bảng học phí của tháng đang xem (đã
              có sẵn cột từng buổi kèm ngày) — sửa số liệu trực tiếp trong Excel rồi tải file đó lên
              lại.
            </p>
            <Shot
              src="hoc-phi/07-nhap-dialog-mau.png"
              w={1280}
              h={900}
              alt="Hộp thoại nhập Excel — tải mẫu và chọn file"
            />
          </Step>
          <Step n={7}>
            <p>
              Bấm <strong>&quot;Xem trước&quot;</strong> để hệ thống hiện bảng các thay đổi sẽ được
              áp dụng — dòng lỗi (email không khớp học sinh trong lớp, số tiền không hợp lệ...) sẽ
              bị bỏ qua và không chặn các dòng hợp lệ khác. Kiểm tra lại rồi bấm{' '}
              <strong>&quot;Xác nhận đồng bộ&quot;</strong> để ghi vào hệ thống.
            </p>
            <Shot
              src="hoc-phi/08-nhap-xem-truoc.png"
              w={1280}
              h={900}
              alt="Xem trước thay đổi trước khi đồng bộ học phí"
            />
          </Step>
        </Section>
      ),
    },
    {
      id: 'khoa-hoc',
      content: (
        <Section
          id="khoa-hoc"
          icon={BookOpen}
          title="Khóa học"
          intro="Quản lý nội dung khoá học online (video, tài liệu, bài kiểm tra) và học sinh ghi danh."
        >
          <Step n={1}>
            <p>
              Card <strong>&quot;Lịch học trên trang chủ&quot;</strong> quản lý ảnh lịch học hiển
              thị công khai ở trang chủ — bấm <strong>&quot;Chỉnh sửa&quot;</strong> để đổi. Bên
              dưới là bộ lọc theo tên/mã khóa học, danh mục, trạng thái, và nút{' '}
              <strong>&quot;Tạo khóa học&quot;</strong>.
            </p>
            <Shot src="khoa-hoc/01-danh-sach.png" w={1280} h={950} alt="Danh sách khoá học" />
          </Step>
          <Step n={2}>
            <p>
              Chi tiết khoá học có 4 tab: <strong>Thông tin</strong> / <strong>Nội dung</strong> /{' '}
              <strong>Học sinh</strong> / <strong>Thống kê</strong>. Tab Thông tin gồm tên, mã,
              trạng thái (Bản nháp / Đang phát hành / Lưu trữ), danh mục, giảng viên, học phí, thời
              gian học, hạn ghi danh, mô tả, đối tượng và mục tiêu — bấm{' '}
              <strong>&quot;Chỉnh sửa&quot;</strong> để đổi.
            </p>
            <Shot
              src="khoa-hoc/02-tab-thong-tin.png"
              w={1280}
              h={950}
              alt="Tab Thông tin của khoá học"
            />
          </Step>
          <Step n={3}>
            <p>
              Tab <strong>Nội dung</strong> tổ chức kiểu Google Drive: bấm{' '}
              <strong>&quot;Thư mục&quot;</strong> để tạo chương, <strong>&quot;Tệp&quot;</strong>{' '}
              để tải lên bài học (video/tài liệu) — hoặc kéo-thả tệp/video thẳng vào một thư mục để
              tải lên ngay. Kéo icon <strong>⠿</strong> để đổi thứ tự trong cùng thư mục; muốn
              chuyển sang thư mục khác thì dùng menu <strong>&quot;⋮&quot;</strong> →{' '}
              <strong>Di chuyển</strong> rồi chọn thư mục đích. Menu này cũng dùng để đổi tên/xoá.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Shot
                src="khoa-hoc/03-tab-noi-dung.png"
                w={1280}
                h={950}
                alt="Tab Nội dung của khoá học"
                size="full"
              />
              <Shot
                src="khoa-hoc/04-noi-dung-them.png"
                w={1280}
                h={950}
                alt="Nút thêm chương và thêm bài học"
                size="full"
              />
            </div>
          </Step>
          <Step n={4}>
            <p>
              <strong>&quot;Bài kiểm tra&quot;</strong> (cuối tab Nội dung): ra đề bằng ảnh/PDF, đặt
              khung giờ làm bài — hết giờ hệ thống tự khoá nộp. Bấm{' '}
              <strong>&quot;Tạo bài kiểm tra&quot;</strong> rồi nhập Tên, Bắt đầu/Kết thúc, Điểm tối
              đa và tải đề bài lên (tối đa 30 tệp, mỗi tệp 50 MB). Phần &quot;Mô tả / hướng
              dẫn&quot; chỉ hiện với học sinh SAU KHI bài đã bắt đầu, nên có thể viết luôn đề bài
              dạng chữ vào đây nếu không cần ảnh/PDF.
            </p>
            <p>
              Chấm xong bài nào là học sinh đó thấy <strong>điểm và nhận xét ngay</strong>, không
              chờ bài kết thúc (phổ điểm cả lớp vẫn chỉ hiện sau khi kết thúc). Bài đã chấm thì học
              sinh không tự nộp lại được — nếu cần cho em đó nộp lại, bấm{' '}
              <strong>&quot;Mở lại&quot;</strong> ở dòng của em trong danh sách bài nộp; nộp lại sẽ
              xoá điểm cũ để chấm lại.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Shot
                src="khoa-hoc/06-bai-kiem-tra.png"
                w={1280}
                h={950}
                alt="Khu vực bài kiểm tra"
                size="full"
              />
              <Shot
                src="khoa-hoc/07-tao-bai-kiem-tra-dialog.png"
                w={1280}
                h={950}
                alt="Hộp thoại tạo bài kiểm tra"
                size="full"
              />
            </div>
          </Step>
          <Step n={5}>
            <p>
              Tab <strong>Học sinh</strong>: tìm theo email/họ tên, bấm{' '}
              <strong>&quot;Thêm học sinh&quot;</strong> để ghi danh học sinh vào khoá học.
            </p>
            <Shot
              src="khoa-hoc/08-tab-hoc-sinh.png"
              w={1280}
              h={950}
              alt="Tab Học sinh của khoá học"
            />
          </Step>
          <Step n={6}>
            <p>
              Tab <strong>Thống kê</strong> cho biết học sinh nào đã xem video nào, xem trong bao
              lâu — bấm <strong>&quot;Xuất CSV&quot;</strong> nếu cần báo cáo riêng.
            </p>
            <Shot
              src="khoa-hoc/09-tab-thong-ke.png"
              w={1280}
              h={950}
              alt="Tab Thống kê xem video của khoá học"
            />
          </Step>
        </Section>
      ),
    },
    {
      id: 'danh-muc',
      content: (
        <Section
          id="danh-muc"
          icon={GraduationCap}
          title="Danh mục khóa học"
          intro="Quản lý các danh mục dùng để phân loại khoá học, ví dụ Vật lý 10 / 11 / 12."
        >
          <Step n={1}>
            <p>
              Bộ lọc theo tên danh mục; bấm <strong>&quot;Tạo danh mục&quot;</strong> để tạo mới.
            </p>
            <Shot
              src="danh-muc/01-danh-sach.png"
              w={1280}
              h={900}
              alt="Danh sách danh mục khoá học"
            />
          </Step>
          <Step n={2}>
            <p>
              Form tạo: Tên danh mục và Slug là bắt buộc — Slug dùng trong đường dẫn URL, chỉ gồm
              chữ thường/số/gạch ngang (ví dụ{' '}
              <code className="bg-muted rounded px-1 py-0.5 text-xs">vat-ly-lop-12</code>). Mô tả
              không bắt buộc. &quot;Thứ tự hiển thị&quot; — số nhỏ hơn hiện trước.
            </p>
            <Shot src="danh-muc/02-tao-dialog.png" w={1280} h={900} alt="Form tạo danh mục" />
          </Step>
          <Step n={3}>
            <p>
              Mỗi dòng có icon <strong>Sửa</strong> và <strong>Xoá</strong>; cột &quot;Khóa
              học&quot; cho biết đang có bao nhiêu khoá học thuộc danh mục đó.
            </p>
            <Shot src="danh-muc/03-hanh-dong-dong.png" w={1280} h={900} alt="Sửa và xoá danh mục" />
          </Step>
        </Section>
      ),
    },
    {
      id: 'ho-so',
      content: (
        <Section
          id="ho-so"
          icon={UserRound}
          title="Thông tin cá nhân"
          intro="Xem/sửa thông tin tài khoản của chính admin đang đăng nhập và đổi mật khẩu."
        >
          <Step n={1}>
            <p>
              Card <strong>&quot;Thông tin chi tiết&quot;</strong> hiển thị họ tên, giới tính, tỉnh,
              trường, SĐT phụ huynh, link Facebook, vai trò — bấm{' '}
              <strong>&quot;Chỉnh sửa&quot;</strong> để mở form sửa.
            </p>
            <Shot src="ho-so/01-thong-tin.png" w={1280} h={950} alt="Thông tin chi tiết cá nhân" />
          </Step>
          <Step n={2}>
            <p>
              Sửa các trường cần đổi rồi bấm <strong>&quot;Lưu thay đổi&quot;</strong> (hoặc{' '}
              <strong>&quot;Hủy&quot;</strong> để bỏ thay đổi).
            </p>
            <Shot src="ho-so/02-chinh-sua.png" w={1280} h={950} alt="Form sửa thông tin cá nhân" />
          </Step>
          <Step n={3}>
            <p>
              Card <strong>&quot;Đổi mật khẩu&quot;</strong>: nhập mật khẩu hiện tại và mật khẩu mới
              (tối thiểu 8 ký tự, có ít nhất 1 chữ hoa và 1 số), xác nhận lại rồi bấm{' '}
              <strong>&quot;Đổi mật khẩu&quot;</strong>.
            </p>
            <Shot src="ho-so/03-doi-mat-khau.png" w={1280} h={900} alt="Form đổi mật khẩu" />
          </Step>
        </Section>
      ),
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Trợ giúp sử dụng"
        description="Hướng dẫn sử dụng từng chức năng trong hệ thống — chọn 1 mục ở menu bên trái để xem hướng dẫn."
      />
      <HelpSections sections={sections} />
    </div>
  );
}
