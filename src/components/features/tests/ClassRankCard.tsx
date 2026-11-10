'use client';

import { Hourglass, Lock, Medal, TrendingUp, Trophy, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ScoreRank } from '@/types/tests';

interface Props {
  rank: ScoreRank | null;
  /** null = bài chưa kết thúc. */
  gradedCount: number | null;
  pendingCount: number | null;
  minGraded: number;
}

const PODIUM = [
  {
    icon: Trophy,
    label: 'Huy chương vàng',
    medal: 'bg-linear-to-br from-amber-200 via-gold to-amber-500 text-amber-950 ring-amber-300/60',
  },
  {
    icon: Medal,
    label: 'Huy chương bạc',
    medal:
      'bg-linear-to-br from-slate-100 via-slate-300 to-slate-400 text-slate-800 ring-slate-300/70',
  },
  {
    icon: Medal,
    label: 'Huy chương đồng',
    medal:
      'bg-linear-to-br from-orange-200 via-orange-300 to-amber-600 text-orange-950 ring-orange-300/60',
  },
];

const CHIP = 'text-purple-dark gap-1.5 bg-white/80 px-3 py-1 text-sm font-normal';

function cheer(rank: ScoreRank, pct: number): string {
  if (rank.rank === 1) {
    return rank.tiedWith > 0
      ? 'Xuất sắc! Bạn cùng dẫn đầu lớp.'
      : 'Xuất sắc! Bạn có điểm cao nhất lớp.';
  }
  if (pct <= 10) return 'Tuyệt vời! Bạn thuộc nhóm dẫn đầu của lớp.';
  if (pct <= 50) return 'Làm tốt lắm! Bạn nằm trong nửa trên của lớp.';
  return 'Mỗi bài kiểm tra là một bước tiến - đọc nhận xét của giáo viên để bứt phá ở bài sau nhé!';
}

export default function ClassRankCard({ rank, gradedCount, pendingCount, minGraded }: Props) {
  if (!rank || !gradedCount) {
    const ended = gradedCount !== null;
    const Icon = ended ? Users : Lock;
    return (
      <Card className="border-dashed">
        <CardContent className="flex h-full items-center gap-4 py-5 sm:py-6">
          <span className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center rounded-full">
            <Icon className="size-5" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium">Xếp hạng trong lớp</p>
            <p className="text-muted-foreground text-sm">
              {ended
                ? `Chưa đủ dữ liệu — cần ít nhất ${minGraded} bài được chấm để xếp hạng mà vẫn giữ kín điểm của các bạn.`
                : 'Xếp hạng sẽ hiện khi bài kiểm tra kết thúc.'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const podium = PODIUM[rank.rank - 1];
  const pct = Math.max(1, Math.ceil((rank.rank / gradedCount) * 100));

  return (
    <Card className="from-purple/10 to-pink/10 relative overflow-hidden bg-linear-to-br via-white">
      <span
        aria-hidden
        className="bg-purple/10 pointer-events-none absolute -top-10 -right-10 size-32 rounded-full blur-2xl"
      />
      <CardContent className="relative space-y-4 py-5 sm:py-6">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'relative flex size-16 shrink-0 items-center justify-center rounded-full shadow-md ring-4 sm:size-[4.5rem]',
              'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-75 motion-safe:duration-500',
              podium ? podium.medal : 'text-purple ring-purple/10 bg-white shadow-sm',
            )}
            role="img"
            aria-label={podium ? podium.label : `Hạng ${rank.rank}`}
          >
            {podium ? (
              <>
                <podium.icon className="size-7 sm:size-8" strokeWidth={2.25} />
                <span className="bg-background text-foreground absolute -right-1 -bottom-1 flex size-6 items-center justify-center rounded-full text-xs font-bold shadow ring-1 ring-black/5">
                  {rank.rank}
                </span>
              </>
            ) : (
              <span className="text-xl font-bold tabular-nums sm:text-2xl">#{rank.rank}</span>
            )}
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-muted-foreground text-sm">Xếp hạng trong lớp</p>
              {!!pendingCount && (
                <Badge variant="warning" className="gap-1">
                  <Hourglass className="size-3" aria-hidden /> Tạm tính
                </Badge>
              )}
            </div>
            <p className="text-3xl leading-none font-bold tracking-tight tabular-nums sm:text-4xl">
              Hạng <span className="text-purple">{rank.rank}</span>
              <span className="text-muted-foreground text-lg font-medium sm:text-xl">
                {' '}
                / {gradedCount}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {rank.tiedWith > 0 && (
            <Badge className={CHIP}>
              <Users className="size-4" aria-hidden />
              <span>
                Đồng hạng với <strong className="font-semibold">{rank.tiedWith}</strong> bạn
              </span>
            </Badge>
          )}
          {pct <= 50 && (
            <Badge className={CHIP}>
              <TrendingUp className="size-4" aria-hidden />
              <span>
                Top <strong className="font-semibold">{pct}%</strong> của lớp
              </span>
            </Badge>
          )}
        </div>

        <p className="text-sm">{cheer(rank, pct)}</p>

        {!!pendingCount && (
          <p className="text-muted-foreground text-xs">
            Còn {pendingCount} bài chưa chấm xong - hạng có thể thay đổi.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
