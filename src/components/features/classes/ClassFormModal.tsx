'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ActionButton } from '@/components/ui/custom';
import { handleActionResult } from '@/lib/actions';
import { createClassAction } from '@/actions/v1/classes/create-class';
import { updateClassAction } from '@/actions/v1/classes/update-class';
import { parseIntAmount } from '@/lib/tuition';
import type { ClassRow, ClassStatus } from '@/types/class-management';

const MONEY_ERROR = 'Học phí phải là số nguyên không âm';

function MoneyField({
  id,
  label,
  hint,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  error: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        step={1000}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      />
      {error ? (
        <p className="text-destructive text-xs">{error}</p>
      ) : (
        <p className="text-muted-foreground text-xs">{hint}</p>
      )}
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialData?: ClassRow;
}

export default function ClassFormModal({ open, onOpenChange, mode, initialData }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(initialData?.name ?? '');
  const [code, setCode] = useState(initialData?.code ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [status, setStatus] = useState<ClassStatus>(initialData?.status ?? 'ACTIVE');
  const [monthlyFee, setMonthlyFee] = useState(String(initialData?.monthlyFee ?? 0));
  const [attendanceEmailEnabled, setAttendanceEmailEnabled] = useState(
    initialData?.attendanceEmailEnabled ?? false,
  );
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted && !name.trim() ? 'Vui lòng nhập tên lớp' : '';
  const codeError = submitted && !code.trim() ? 'Vui lòng nhập mã lớp' : '';
  const monthlyFeeError = submitted && parseIntAmount(monthlyFee) === null ? MONEY_ERROR : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!name.trim()) return;
    if (!code.trim()) return;
    const monthly = parseIntAmount(monthlyFee);
    if (monthly === null) return;

    setLoading(true);
    try {
      if (mode === 'create') {
        const result = await createClassAction({
          name: name.trim(),
          code: code.trim(),
          description: description.trim() || undefined,
          monthlyFee: monthly,
          attendanceEmailEnabled,
        });
        handleActionResult(
          result.errors,
          () => {
            onOpenChange(false);
            router.refresh();
          },
          'Tạo lớp thành công',
        );
      } else if (initialData) {
        const result = await updateClassAction(initialData.id, {
          name: name.trim(),
          code: code.trim(),
          description: description.trim() || undefined,
          status,
          monthlyFee: monthly,
          attendanceEmailEnabled,
        });
        handleActionResult(
          result.errors,
          () => {
            onOpenChange(false);
            router.refresh();
          },
          'Cập nhật lớp thành công',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Tạo lớp học' : 'Chỉnh sửa lớp học'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Nhập thông tin để tạo lớp học mới.'
              : 'Cập nhật thông tin lớp học hiện tại.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="class-name">
              Tên lớp <span className="text-destructive">*</span>
            </Label>
            <Input
              id="class-name"
              placeholder="VD: Lớp Vật lý 10A1"
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!nameError}
            />
            {nameError && <p className="text-destructive text-xs">{nameError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="class-code">
              Mã lớp <span className="text-destructive">*</span>
            </Label>
            <Input
              id="class-code"
              placeholder="VD: VL10A1"
              maxLength={20}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-invalid={!!codeError}
            />
            {codeError && <p className="text-destructive text-xs">{codeError}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="class-desc">Mô tả</Label>
            <Textarea
              id="class-desc"
              rows={3}
              placeholder="Mô tả lớp học (không bắt buộc)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <MoneyField
            id="class-monthly-fee"
            label="Học phí / tháng (VNĐ)"
            hint="Mức thu 1 tháng cho HS đang theo học (tháng có buổi). Sửa được tay từng dòng ở bảng học phí."
            value={monthlyFee}
            onChange={setMonthlyFee}
            error={monthlyFeeError}
          />
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Checkbox
              id="class-attendance-email"
              checked={attendanceEmailEnabled}
              onCheckedChange={(v) => setAttendanceEmailEnabled(v === true)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label htmlFor="class-attendance-email" className="cursor-pointer">
                Gửi email kết quả điểm danh cho học sinh
              </Label>
              <p className="text-muted-foreground text-xs">
                Sau mỗi buổi học có mở điểm danh, mỗi học sinh nhận một email báo có mặt, vắng có
                phép (kèm lý do) hoặc vắng không phép.
              </p>
            </div>
          </div>
          {mode === 'edit' && (
            <div className="space-y-1.5">
              <Label>Trạng thái</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ClassStatus)}>
                <SelectTrigger className="cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Đang hoạt động</SelectItem>
                  <SelectItem value="CLOSED">Đã đóng</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="cursor-pointer"
            >
              Huỷ
            </Button>
            <ActionButton
              type="submit"
              isLoading={loading}
              loadingText="Đang lưu..."
              className="cursor-pointer"
            >
              {mode === 'create' ? 'Tạo lớp' : 'Lưu thay đổi'}
            </ActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
