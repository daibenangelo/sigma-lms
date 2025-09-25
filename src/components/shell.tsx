"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { CourseSidebar } from "@/components/course-sidebar";

type Props = {
  children: React.ReactNode;
};

export function Shell({ children }: Props) {
  const pathname = usePathname();
  const isStandalonePage = pathname?.startsWith("/dashboard") || pathname?.startsWith("/profile");
  const isHomePage = pathname === "/";
  const isCoursePage = pathname?.startsWith("/course/");
  const isProgramsPage = pathname?.startsWith("/programs");
  const isCoursesPage = pathname?.startsWith("/csdp/courses");

  if (isStandalonePage || isHomePage || isCoursePage || isProgramsPage || isCoursesPage) {
    return (
      <div className="min-h-screen bg-white">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <CourseSidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Navbar />
        <main className="flex-1 bg-gray-50 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}


