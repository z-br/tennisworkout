import { data } from "react-router";
import type { Route } from "./+types/published-print";
import { PrintSheets } from "~/components/PrintSheets";
import { getPublished } from "~/lib/publish.server";

export async function loader({ params }: Route.LoaderArgs) {
  let row;
  try {
    row = await getPublished(params.slug);
  } catch {
    throw data("Unavailable", { status: 503 });
  }
  if (!row) throw data("Not found", { status: 404 });
  return { row };
}

export function meta({ loaderData }: Route.MetaArgs) {
  const name = loaderData?.row.doc.meta.name;
  return [{ title: name ? `Print ${name} — Tennis Workout Builder` : "Print — Tennis Workout Builder" }];
}

export default function PublishedPrint({ loaderData }: Route.ComponentProps) {
  const { row } = loaderData;
  return <PrintSheets doc={row.doc} backTo={`/p/${row.slug}`} backLabel="← Back to plan" />;
}
