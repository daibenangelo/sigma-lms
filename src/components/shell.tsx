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
    "/dashboard",
    "/profile"
  ];

  // Pages that should show navbar but not sidebar
  const navbarOnlyPages = [
    "/programs",
    "/csdp/courses"
  ];

  // Auth pages that should not show navbar and sidebar
  const authPages = [
    "/auth/login",
    "/auth/signup",
    "/auth/forgot-password",
    "/auth/reset-password"
  ];

  // Check if current path is a course page (e.g., /course/html, /course/css)
  const isCoursePage = pathname?.startsWith("/course/");
  
  // Check if current path is a lesson, tutorial, quiz, or challenge page
  const isContentPage = pathname?.match(/^\/(lesson|tutorial|quiz|challenge)\//);

  const isStandalonePage = standalonePages.some(page => pathname?.startsWith(page));
  const isNavbarOnlyPage = navbarOnlyPages.some(page => pathname?.startsWith(page));
  const isAuthPage = authPages.some(page => pathname?.startsWith(page));

  if (isStandalonePage || isAuthPage) {
    return <Providers>{children}</Providers>;
  }

  if (isNavbarOnlyPage) {
    return (
      <Providers>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
        </div>
      </Providers>
    );
  }

  return (
    <Providers>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex">
          <CourseSidebar />
          <main className="flex-1 pl-80">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
