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
  const standalonePages: string[] = [];

  // Pages that should show navbar but not sidebar
  const navbarOnlyPages = [
    "/programs",
    "/csdp/courses",
    "/profile"
  ];

  // Check if current path is a module page
  const isModulePage = pathname?.startsWith('/module-') || pathname?.startsWith('/module-quiz') || pathname?.startsWith('/module-review') || pathname?.startsWith('/module-project');

  // Auth pages that should not show navbar and sidebar
  const authPages = [
    "/auth/login",
    "/auth/signup",
    "/auth/forgot-password",
    "/auth/reset-password"
  ];

  // Check if current path is a course page (e.g., /course/html, /course/css)
  const isCoursePage = pathname?.startsWith("/course/");

  // Check if current path is a lesson, tutorial, quiz, challenge, or module page
  const isContentPage = pathname?.match(/^\/(lesson|tutorial|quiz|challenge|module-(quiz|review|project)|module-quiz|module-review|module-project)\//);

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
          {pathname?.startsWith('/module-project') && <div className="text-xs text-red-500 p-2 bg-red-50 border">DEBUG: Sidebar should be here</div>}
          <CourseSidebar />
          <main className="flex-1 pl-80">
            {children}
          </main>
        </div>
      </div>
    </Providers>
  );
}
