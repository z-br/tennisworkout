import { Link } from "react-router";
import type { Route } from "./+types/plan.print";
import { PrintSheets } from "~/components/PrintSheets";
import { getPlan } from "~/lib/store/local";

export function meta() {
  return [{ title: "Print — Tennis Workout Builder" }];
}

export async function clientLoader({ params }: Route.ClientLoaderArgs) {
  const plan = await getPlan(params.id);
  return plan ?? null;
}
clientLoader.hydrate = true as const;

export default function PlanPrint({ loaderData }: Route.ComponentProps) {
  if (!loaderData) {
    return (
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-16 text-center">
        <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
          This plan isn't on this device
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Plans are stored locally in your browser and don't sync between devices. If you built
          this plan elsewhere, export it there and import the backup file here to bring it back.
        </p>
        <Link
          to="/"
          className="rounded-full bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
        >
          Back home
        </Link>
      </main>
    );
  }

  return (
    <PrintSheets
      doc={loaderData.doc}
      backTo={`/plan/${loaderData.id}/edit`}
      backLabel="← Back to edit"
    />
  );
}
