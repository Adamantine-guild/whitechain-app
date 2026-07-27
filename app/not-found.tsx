"use client";

const NotFound = () => {
  return (
    <main className="flex  items-center justify-center bg-white px-6 py-16">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center text-center">
        {/* 404 */}
        <div
          className="mb-6 text-8xl font-bold tracking-tight text-gray-900 sm:text-9xl"
          aria-hidden="true"
        >
          404
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          Page not found
        </h1>

        {/* Description */}
        <p className="mt-4 max-w-md text-sm leading-6 text-gray-600 sm:text-base">
          Sorry, we couldn&apos;t find the page you&apos;re looking for. The
          page may have been moved, deleted, or the URL may be incorrect.
        </p>

        {/* Actions */}
        <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-gray-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            Go back home
          </a>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
          >
            Go back
          </button>
        </div>
      </div>
    </main>
  );
};

export default NotFound;