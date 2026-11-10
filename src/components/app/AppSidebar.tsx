'use client';

import { Fragment } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LucideIcon,
  Users,
  LayoutDashboard,
  UserRound,
  School,
  BookOpen,
  Wallet,
  CircleHelp,
  MailCheck,
} from 'lucide-react';
import { ASSETS } from '@/constants/assets';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  section?: string;
}

export const ADMIN_NAV: NavItem[] = [
  { label: 'Người dùng', href: '/admin/accounts', icon: Users, section: 'Quản lý' },
  { label: 'Lớp học', href: '/admin/classes', icon: School, section: 'Quản lý' },
  {
    label: 'Buổi học',
    href: '/admin/classes/class-sessions',
    icon: LayoutDashboard,
    section: 'Quản lý',
  },
  { label: 'Học phí', href: '/admin/tuition', icon: Wallet, section: 'Quản lý' },
  { label: 'Khóa học', href: '/admin/courses', icon: BookOpen, section: 'Quản lý' },
  {
    label: 'Email tự động',
    href: '/admin/email-notifications',
    icon: MailCheck,
    section: 'Quản lý',
  },
  { label: 'Thông tin cá nhân', href: '/admin/profile', icon: UserRound, section: 'Tài khoản' },
  { label: 'Trợ giúp', href: '/admin/help', icon: CircleHelp, section: 'Tài khoản' },
];

/** Trợ giảng: chỉ Lớp học/Buổi học (bật điểm danh) + Khóa học (chấm bài) — không có
 * Người dùng/Học phí/Trợ giúp. */
export const TEACHING_ASSISTANT_NAV: NavItem[] = ADMIN_NAV.filter(
  (item) =>
    item.label !== 'Người dùng' &&
    item.label !== 'Học phí' &&
    item.label !== 'Email tự động' &&
    item.label !== 'Trợ giúp',
);

export const DASHBOARD_NAV: NavItem[] = [
  { label: 'Điểm danh', href: '/dashboard', icon: LayoutDashboard, section: 'Học tập' },
  { label: 'Khóa học', href: '/dashboard/courses', icon: BookOpen, section: 'Học tập' },
  { label: 'Thông tin cá nhân', href: '/dashboard/profile', icon: UserRound, section: 'Tài khoản' },
];

interface Props {
  title: string;
  items: NavItem[];
}

function groupBySection(items: NavItem[]): Array<{ section: string; items: NavItem[] }> {
  const groups = new Map<string, NavItem[]>();
  for (const item of items) {
    const key = item.section ?? 'Menu';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return Array.from(groups, ([section, items]) => ({ section, items }));
}

function matchesHref(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (pathname.startsWith(href + '/')) return true;

  const hrefSegs = href.split('/').filter(Boolean);
  const pathSegs = pathname.split('/').filter(Boolean);
  if (hrefSegs.length > pathSegs.length) return false;

  let hi = 0;
  for (const seg of pathSegs) {
    if (seg === hrefSegs[hi]) hi++;
    if (hi === hrefSegs.length) return true;
  }
  return false;
}

function getActiveHref(pathname: string, items: NavItem[]): string | null {
  let activeHref: string | null = null;
  for (const item of items) {
    if (matchesHref(pathname, item.href)) {
      if (!activeHref || item.href.length > activeHref.length) {
        activeHref = item.href;
      }
    }
  }
  return activeHref;
}

export default function AppSidebar({ title, items }: Props) {
  const pathname = usePathname();
  const groups = groupBySection(items);
  const activeHref = getActiveHref(pathname, items);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-sidebar-border border-b p-0 group-data-[collapsible=icon]:p-0">
        <Link
          href="/"
          className="text-sidebar-foreground hover:bg-sidebar-accent flex h-12 items-center gap-2 px-4 transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          aria-label={title}
        >
          <span className="flex size-9 shrink-0 items-center justify-center">
            <Image
              src={ASSETS.logo}
              alt={title}
              width={36}
              height={36}
              className="size-9 object-contain"
              priority
            />
          </span>
          <span className="font-paytone truncate text-sm group-data-[collapsible=icon]:hidden">
            {title}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map(({ section, items }, idx) => (
          <Fragment key={section}>
            {idx > 0 && <SidebarSeparator className="bg-sidebar-border" />}
            <SidebarGroup>
              <SidebarGroupLabel className="text-sidebar-foreground/60 text-sm">
                {section}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => {
                    const active = item.href === activeHref;
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                          <Link href={item.href}>
                            <item.icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </Fragment>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
