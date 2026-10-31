'use client';

import {
  Activity,
  Calendar,
  CircleDollarSign,
  FileText,
  Hash,
  Mail,
  Tag,
  Users as UsersIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import { formatAmountVnd } from '@/lib/format';
import type { ClassDetail, ClassStatus } from '@/types/class-management';

function statusBadge(s: ClassStatus) {
  if (s === 'ACTIVE') return <Badge variant="success">Đang hoạt động</Badge>;
  return <Badge variant="secondary">Đã đóng</Badge>;
}

interface Props {
  classDetail: ClassDetail;
}

export default function ClassInfoTab({ classDetail }: Props) {
  const fields: Array<{
    label: string;
    value: React.ReactNode;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { label: 'Tên lớp', value: classDetail.name, icon: Tag },
    {
      label: 'Mã lớp',
      icon: Hash,
      value: (
        <code className="bg-muted text-foreground rounded px-1.5 py-0.5 font-mono text-xs">
          {classDetail.code}
        </code>
      ),
    },
    { label: 'Trạng thái', value: statusBadge(classDetail.status), icon: Activity },
    { label: 'Số học sinh', value: classDetail.studentCount ?? 0, icon: UsersIcon },
    { label: 'Ngày tạo', value: formatDate(classDetail.createdAt), icon: Calendar },
    ...(classDetail.monthlyFee !== undefined
      ? [
          {
            label: 'Học phí / tháng',
            value: formatAmountVnd(classDetail.monthlyFee),
            icon: CircleDollarSign,
          },
        ]
      : []),
    ...(classDetail.attendanceEmailEnabled !== undefined
      ? [
          {
            label: 'Email kết quả điểm danh',
            value: classDetail.attendanceEmailEnabled ? (
              <Badge variant="success">Đang bật</Badge>
            ) : (
              <Badge variant="secondary">Đang tắt</Badge>
            ),
            icon: Mail,
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Thông tin lớp học</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 pb-4 sm:pb-6">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
          {fields.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-start gap-3">
              <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {label}
                </dt>
                <dd className="text-foreground text-sm font-medium">{value}</dd>
              </div>
            </div>
          ))}
        </dl>

        <div className="border-divider border-t pt-5">
          <div className="flex items-start gap-3">
            <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
              <FileText className="size-4" />
            </span>
            <div className="min-w-0 flex-1 space-y-1">
              <dt className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                Mô tả
              </dt>
              <dd className="text-foreground text-sm">
                {classDetail.description ? (
                  <p className="whitespace-pre-wrap">{classDetail.description}</p>
                ) : (
                  <span className="text-muted-foreground italic">Không có mô tả</span>
                )}
              </dd>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
