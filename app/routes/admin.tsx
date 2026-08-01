import { data, Form, isRouteErrorResponse, Link, useRouteError } from "react-router";
import type { Route } from "./+types/admin";
import { adminSetFlags, listAllForAdmin, type PublishedRow } from "~/lib/publish.server";

type Op = "hide" | "unhide" | "feature" | "unfeature";
const VALID_OPS: readonly Op[] = ["hide", "unhide", "feature", "unfeature"];

function isValidOp(op: string): op is Op {
  return (VALID_OPS as readonly string[]).includes(op);
}

function flagsForOp(op: Op): { hidden?: boolean; featured?: boolean } {
  switch (op) {
    case "hide":
      return { hidden: true };
    case "unhide":
      return { hidden: false };
    case "feature":
      return { featured: true };
    case "unfeature":
      return { featured: false };
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const rows = await listAllForAdmin(token);
  if (rows === null) throw data("Not found", { status: 404 });
  return { rows, token };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const slug = String(formData.get("slug") ?? "");
  const opRaw = String(formData.get("op") ?? "");
  const token = String(formData.get("token") ?? "");

  if (!isValidOp(opRaw)) {
    return data("Bad request", { status: 400 });
  }

  const ok = await adminSetFlags(slug, flagsForOp(opRaw), token);
  if (!ok) return data({ ok: false }, { status: 403 });
  return { ok: true };
}

export function ErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  return (
    <main className="mx-auto max-w-md px-4 pb-16 pt-24 text-center">
      <h1 className="mb-3 text-2xl font-bold text-gray-900 dark:text-gray-100">
        {status === 404 ? "Not found" : "Something went wrong"}
      </h1>
    </main>
  );
}

function RowActions({ row, token }: { row: PublishedRow; token: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Form method="post">
        <input type="hidden" name="slug" value={row.slug} />
        <input type="hidden" name="op" value={row.hidden ? "unhide" : "hide"} />
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {row.hidden ? "Unhide" : "Hide"}
        </button>
      </Form>
      <Form method="post">
        <input type="hidden" name="slug" value={row.slug} />
        <input type="hidden" name="op" value={row.featured ? "unfeature" : "feature"} />
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {row.featured ? "Unfeature" : "Feature"}
        </button>
      </Form>
    </div>
  );
}

export default function Admin({ loaderData }: Route.ComponentProps) {
  const { rows, token } = loaderData;

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Admin — Published plans</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <th className="pb-2 pr-4 font-semibold">Slug</th>
              <th className="pb-2 pr-4 font-semibold">Name</th>
              <th className="pb-2 pr-4 font-semibold">Created</th>
              <th className="pb-2 pr-4 font-semibold">Remixes</th>
              <th className="pb-2 pr-4 font-semibold">Reports</th>
              <th className="pb-2 pr-4 font-semibold">Hidden</th>
              <th className="pb-2 pr-4 font-semibold">Featured</th>
              <th className="pb-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((row) => (
              <tr key={row.slug}>
                <td className="py-2 pr-4">
                  <Link to={`/p/${row.slug}`} className="text-emerald-600 hover:underline dark:text-emerald-400">
                    {row.slug}
                  </Link>
                </td>
                <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">{row.doc.meta.name}</td>
                <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                  {new Date(row.createdAt).toLocaleDateString()}
                </td>
                <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{row.remixCount}</td>
                <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{row.reportCount}</td>
                <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{row.hidden ? "yes" : "no"}</td>
                <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{row.featured ? "yes" : "no"}</td>
                <td className="py-2">
                  <RowActions row={row} token={token} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">No published plans yet.</p>
        )}
      </div>
    </main>
  );
}
