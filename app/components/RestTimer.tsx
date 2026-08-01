import { useEffect, useState } from "react";

/**
 * 60s/90s rest countdown. No sound — just a fixed bottom bar with the time
 * remaining and a Stop button while a rest is running.
 */
export function RestTimer() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const timer = setTimeout(() => {
      setSecondsLeft((s) => (s === null ? null : s - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  function start(duration: number) {
    setSecondsLeft(duration);
  }

  function stop() {
    setSecondsLeft(null);
  }

  const running = secondsLeft !== null && secondsLeft > 0;

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => start(60)}
          data-testid="rest-60-btn"
          className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500"
        >
          Rest 60s
        </button>
        <button
          type="button"
          onClick={() => start(90)}
          data-testid="rest-90-btn"
          className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500"
        >
          Rest 90s
        </button>
      </div>

      {running && (
        <div className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-2px_8px_rgba(0,0,0,0.06)] dark:border-gray-800 dark:bg-gray-950">
          <span className="text-lg font-semibold tabular-nums text-gray-900 dark:text-gray-100">
            Resting… {secondsLeft}s
          </span>
          <button
            type="button"
            onClick={stop}
            data-testid="rest-stop-btn"
            className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
          >
            Stop
          </button>
        </div>
      )}
    </>
  );
}
