"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { CourseSidebar } from "@/components/course-sidebar";
import { Providers } from "@/components/providers";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const pathname = usePathname();

  // Pages that should not show navbar and sidebar
  const standalonePages = [
    "/programs",
    "/csdp/courses",
    "/dashboard",
    "/profile"
  ];

  // Check if current path is a course page (e.g., /course/html, /course/css)
  const isCoursePage = pathname?.startsWith("/course/");

  const isStandalonePage = standalonePages.some(page => pathname?.startsWith(page));

  if (isStandalonePage || isCoursePage) {
    return <Providers>{children}</Providers>;
  }

  return (
    <Providers>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <CourseSidebar />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
