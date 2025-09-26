import Link from "next/link";
import { BookOpen, Code, Palette, Database, Globe, Zap } from "lucide-react";

const courses = [
  {
    id: "html",
    title: "HTML Fundamentals",
    description: "Learn the building blocks of web development with HTML",
    icon: Globe,
    color: "bg-blue-500",
    href: "/course/html"
  },
  {
    id: "css",
    title: "CSS Styling",
    description: "Master the art of styling web pages with CSS",
    icon: Palette,
    color: "bg-purple-500",
    href: "/course/css"
  },
  {
    id: "javascript",
    title: "JavaScript Programming",
    description: "Learn the language that powers the web",
    icon: Code,
    color: "bg-yellow-500",
    href: "/course/javascript"
  },
  {
    id: "react",
    title: "React Development",
    description: "Build dynamic user interfaces with React",
    icon: Zap,
    color: "bg-cyan-500",
    href: "/course/react"
  },
  {
    id: "node",
    title: "Node.js Backend",
    description: "Server-side JavaScript development",
    icon: Database,
    color: "bg-green-500",
    href: "/course/node"
  },
  {
    id: "sql",
    title: "SQL Database",
    description: "Master database management with SQL",
    icon: Database,
    color: "bg-orange-500",
    href: "/course/sql"
  }
];

export default function CourseSelectionPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Learning Path
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Select a course to begin your software development journey. 
            Each course is designed to take you from beginner to advanced level.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => {
            const IconComponent = course.icon;
            return (
              <Link
                key={course.id}
                href={course.href}
                className="group block bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 p-6 border border-gray-200 hover:border-gray-300"
              >
                <div className="flex items-center mb-4">
                  <div className={`${course.color} p-3 rounded-lg mr-4`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600">
                    {course.title}
                  </h3>
                </div>
                <p className="text-gray-600 mb-4">
                  {course.description}
                </p>
                <div className="flex items-center text-blue-600 font-medium group-hover:text-blue-700">
                  Start Learning
                  <svg className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-500 mb-4">
            Not sure where to start? We recommend beginning with HTML Fundamentals.
          </p>
          <Link
            href="/course/html"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Start with HTML
          </Link>
        </div>
      </div>
    </div>
  );
}