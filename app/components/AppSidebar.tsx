"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  PlusSquare,
  Settings2,
  Shield,
  Shuffle,
  Trophy,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/app/components/ui/sidebar";

const navItems = [
  { label: "Home", description: "10 questions, pick & go", href: "/", icon: BookOpen },
  { label: "Advanced", description: "Custom topics & difficulty", href: "/advanced", icon: Settings2 },
  { label: "Build Quiz", description: "Create your own quizzes", href: "/build", icon: PlusSquare },
  { label: "Dashboard", description: "Stats & history", href: "/dashboard", icon: LayoutDashboard },
  { label: "Achievements", description: "Badges & rewards", href: "/achievements", icon: Trophy },
];

const adminItem = {
  label: "Admin",
  description: "Quiz builder",
  href: "/admin/quiz-builder",
  icon: Shield,
};

type UserProfile = {
  displayName: string;
  xp: number;
  level: number;
};

function xpForLevel(level: number) {
  return level * 500;
}

function UserXPCard({ profile }: { profile: UserProfile }) {
  const xpNeeded = xpForLevel(profile.level);
  const initials = profile.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-accent transition-colors">
      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] flex items-center justify-center text-white text-sm font-medium shrink-0 select-none">
        {initials}
      </div>
      <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
        <p className="text-sm font-medium text-sidebar-foreground leading-none truncate">
          {profile.displayName}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Level {profile.level} · {profile.xp} XP
        </p>
      </div>
      <div className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 shrink-0 group-data-[collapsible=icon]:hidden">
        <span className="text-amber-600 text-xs font-medium">Lv.{profile.level}</span>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [profile, setProfile] = React.useState<UserProfile>({
    displayName: "Student",
    xp: 0,
    level: 1,
  });

  React.useEffect(() => {
    setIsAdmin(localStorage.getItem("role") === "admin");
    const stored = localStorage.getItem("userProfile");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Partial<UserProfile>;
        setProfile({
          displayName: parsed.displayName ?? "Student",
          xp: parsed.xp ?? 0,
          level: parsed.level ?? 1,
        });
      } catch {
        // ignore corrupt data
      }
    }
  }, []);

  const items = isAdmin ? [...navItems, adminItem] : navItems;

  async function handleRandomQuiz() {
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty: "mixed", size: 10, mode: "ordinary" }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (data.id) router.push(`/quiz/${data.id}`);
    } catch {
      // silently fail
    }
  }

  return (
    <Sidebar collapsible="icon">
      {/* Logo */}
      <SidebarHeader className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#4f46e5] to-[#7c3aed] shrink-0">
            <GraduationCap size={18} className="text-white" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden">
            <p className="font-semibold text-sidebar-foreground leading-none">Learning Curve</p>
            <p className="text-xs text-muted-foreground mt-0.5">Knowledge Platform</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4">
        {/* Menu label */}
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-3 mb-2 group-data-[collapsible=icon]:hidden">
          Menu
        </p>

        {/* Nav items */}
        <nav className="flex flex-col gap-1">
          {items.map(({ label, description, href, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group-data-[collapsible=icon]:justify-center",
                  active
                    ? "bg-[#eef2ff] text-[#4f46e5]"
                    : "text-foreground hover:bg-accent",
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg transition-all shrink-0",
                    active
                      ? "bg-[#4f46e5] text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium leading-none truncate">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
                </div>
                {active && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[#4f46e5] shrink-0 group-data-[collapsible=icon]:hidden" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Quick Actions */}
        <div className="mt-4 pt-4 border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-3 mb-2">
            Quick Actions
          </p>
          <button
            onClick={handleRandomQuiz}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-foreground hover:bg-accent transition-all w-full cursor-pointer"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground shrink-0">
              <Shuffle size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-none">Random Quiz</p>
              <p className="text-xs text-muted-foreground mt-0.5">Surprise me!</p>
            </div>
          </button>
        </div>
      </SidebarContent>

      <SidebarFooter className="px-3 py-4 border-t border-sidebar-border">
        <UserXPCard profile={profile} />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
