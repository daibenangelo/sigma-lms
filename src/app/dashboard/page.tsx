export default function DashboardPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      <h1 className="text-center text-xl font-semibold text-gray-900">Welcome back, Deric.</h1>

      {/* Donation progress */}
      <div className="rounded-lg bg-white border border-gray-200 p-6 text-gray-900">
        <p className="text-center text-sm italic text-gray-600 mb-4">
          “Looking at code you wrote more than two weeks ago is like looking at code you are seeing for the first time.” — Dan Hurvitz
        </p>
        <div className="mx-auto max-w-md rounded-md bg-gray-50 border border-gray-200 p-4">
          <p className="text-center text-xs text-gray-600">Progress towards donation goal</p>
          <div className="h-2 bg-gray-200 rounded mt-2 overflow-hidden">
            <div className="h-full w-[57%] bg-blue-500" />
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-600">Donate now to help our charity reach our goal of 20,000 monthly supporters this year.</span>
            <a href="#" className="ml-3 inline-flex items-center justify-center rounded border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">Donate</a>
          </div>
        </div>
      </div>

      {/* Recommended curriculum */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-800">Recommended curriculum (still in beta):</h2>
        <a href="/lesson/semantic-html" className="block rounded border border-gray-200 bg-white px-4 py-3 text-gray-900 hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-gray-100 text-gray-700">{`</>`}</span>
            <span className="text-sm">Certified Full Stack Developer Curriculum</span>
          </div>
        </a>
      </section>

      {/* Coding challenge */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-800">Try the coding challenge of the day:</h2>
        <div className="space-y-2">
          <a href="#" className="block rounded border border-gray-200 bg-white px-4 py-3 text-gray-900 hover:bg-gray-50">Start</a>
          <a href="#" className="block rounded border border-gray-200 bg-white px-4 py-3 text-gray-900 hover:bg-gray-50">Go to Archive</a>
        </div>
      </section>

      {/* Learn English for Developers */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-800">Learn English for Developers:</h2>
        <div className="space-y-2">
          <a href="#" className="block rounded border border-gray-200 bg-white px-4 py-3 text-gray-900 hover:bg-gray-50">A2 English for Developers (Beta) Certification</a>
          <a href="#" className="block rounded border border-gray-200 bg-white px-4 py-3 text-gray-900 hover:bg-gray-50">B1 English for Developers (Beta) Certification</a>
        </div>
      </section>

      {/* Interview prep */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-800">Prepare for the developer interview job search:</h2>
        <div className="space-y-2">
          <a href="#" className="block rounded border border-gray-200 bg-white px-4 py-3 text-gray-900 hover:bg-gray-50">The Odin Project - freeCodeCamp Remix</a>
          <a href="#" className="block rounded border border-gray-200 bg-white px-4 py-3 text-gray-900 hover:bg-gray-50">Coding Interview Prep</a>
          <a href="#" className="block rounded border border-gray-200 bg-white px-4 py-3 text-gray-900 hover:bg-gray-50">Project Euler</a>
        </div>
      </section>
    </div>
  );
}
