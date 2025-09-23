export default function ProfilePage() {
  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8">
      {/* Profile Header */}
      <div className="rounded-lg bg-white border border-gray-200 p-6">
        <div className="flex items-center space-x-6">
          <div className="relative">
            <div className="w-24 h-24 bg-amber-100 rounded-lg flex items-center justify-center border-2 border-white shadow-sm">
              <div className="w-16 h-16 bg-amber-200 rounded-lg flex items-center justify-center">
                <div className="w-12 h-12 bg-amber-300 rounded-lg flex items-center justify-center">
                  <div className="w-8 h-8 bg-orange-400 rounded-lg flex items-center justify-center">
                    <div className="w-4 h-4 bg-orange-500 rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">@dericyee</h1>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span className="text-sm text-gray-600">LinkedIn Profile</span>
            </div>
          </div>
        </div>
      </div>

      {/* Certifications */}
      <div className="space-y-6">
        <div className="rounded-lg bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">freeCodeCamp Certifications</h2>
          <div className="space-y-3">
            <button className="w-full text-left p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
              <span className="text-gray-900 font-medium">View Responsive Web Design Certification</span>
            </button>
          </div>
        </div>

        <div className="rounded-lg bg-white border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Legacy Certifications</h2>
          <div className="space-y-3">
            <button className="w-full text-left p-4 rounded-lg border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors">
              <span className="text-gray-900 font-medium">View Legacy JavaScript Algorithms and Data Structures Certification</span>
            </button>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="rounded-lg bg-white border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Timeline</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Challenge</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Solution</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900">Completed</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <a href="#" className="text-blue-600 hover:text-blue-800 underline">
                    Build a Curriculum Outline - Step 1
                  </a>
                </td>
                <td className="py-3 px-4 text-gray-500">-</td>
                <td className="py-3 px-4 text-gray-600">Sep 12, 2025</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <a href="#" className="text-blue-600 hover:text-blue-800 underline">
                    Introduction: Elements of Python
                  </a>
                </td>
                <td className="py-3 px-4 text-gray-500">-</td>
                <td className="py-3 px-4 text-gray-600">Jul 10, 2020</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <a href="#" className="text-blue-600 hover:text-blue-800 underline">
                    Iterations: Definite Loops
                  </a>
                </td>
                <td className="py-3 px-4 text-gray-500">-</td>
                <td className="py-3 px-4 text-gray-600">Jul 10, 2020</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4">
                  <a href="#" className="text-blue-600 hover:text-blue-800 underline">
                    Python Functions
                  </a>
                </td>
                <td className="py-3 px-4 text-gray-500">-</td>
                <td className="py-3 px-4 text-gray-600">Jul 10, 2020</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
