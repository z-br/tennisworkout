import { Resvg } from "@resvg/resvg-js";
import { data } from "react-router";
import type { Route } from "./+types/published-card";
import { getPublished, type PublishedRow } from "~/lib/publish.server";

const WIDTH = 1200;
const HEIGHT = 630;

/** Escapes text embedded in the SVG so user-supplied plan names/goals can't break out of markup. */
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** Wraps to at most maxLines, truncating the last line with an ellipsis if the text overflows. */
function fitLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const all = wrapText(text, maxCharsPerLine);
  if (all.length <= maxLines) return all;
  const kept = all.slice(0, maxLines);
  const last = kept[maxLines - 1];
  kept[maxLines - 1] = `${last.slice(0, Math.max(0, maxCharsPerLine - 1)).trimEnd()}…`;
  return kept;
}

function buildSvg(row: PublishedRow): string {
  const { doc } = row;
  const nameLines = fitLines(doc.meta.name, 22, 2);
  const equipmentText =
    doc.meta.equipment.length > 0 ? doc.meta.equipment.join(", ") : "no equipment";
  const infoLine = `${doc.meta.daysPerWeek} day${doc.meta.daysPerWeek === 1 ? "" : "s"}/week · ${equipmentText}`;

  const nameFontSize = 64;
  const nameLineHeight = 76;
  const nameStartY = nameLines.length === 1 ? 320 : 280;
  const nameTspans = nameLines
    .map((line, i) => `<tspan x="100" y="${nameStartY + i * nameLineHeight}">${esc(line)}</tspan>`)
    .join("");

  const badgeY = nameStartY + (nameLines.length - 1) * nameLineHeight + 60;
  const badgeFontSize = 26;
  let badgeX = 100;
  const badges = doc.meta.goals
    .map((goal) => {
      const label = esc(goal);
      const width = label.length * 15 + 40;
      const svg =
        `<rect x="${badgeX}" y="${badgeY}" rx="23" ry="23" width="${width}" height="46" ` +
        `fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" />` +
        `<text x="${badgeX + width / 2}" y="${badgeY + 30}" font-size="${badgeFontSize}" ` +
        `fill="#ffffff" text-anchor="middle" font-family="sans-serif">${label}</text>`;
      badgeX += width + 16;
      return svg;
    })
    .join("");

  return `<svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#153b28" />
      <stop offset="100%" stop-color="#2f6b49" />
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)" />
  <text font-family="sans-serif" font-weight="700" font-size="${nameFontSize}" fill="#ffffff">${nameTspans}</text>
  ${badges}
  <text x="100" y="${HEIGHT - 130}" font-family="sans-serif" font-size="30" fill="rgba(255,255,255,0.85)">${esc(infoLine)}</text>
  <text x="100" y="${HEIGHT - 70}" font-family="sans-serif" font-size="26" fill="rgba(255,255,255,0.6)">Tennis Workout Builder</text>
</svg>`;
}

export async function loader({ params }: Route.LoaderArgs) {
  let row;
  try {
    row = await getPublished(params.slug);
  } catch {
    throw data("Unavailable", { status: 503 });
  }
  if (!row) throw data("Not found", { status: 404 });

  const svg = buildSvg(row);

  try {
    const png = new Resvg(svg).render().asPng();
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        // Not immutable/year-long: a plan can be hidden by moderation after
        // its card has been cached, and the card must stop being served
        // reasonably soon after that.
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    // Resvg is a native binding; if it fails to load/render on this platform,
    // degrade to serving the raw SVG rather than a broken share card.
    console.error("resvg render failed, falling back to SVG", err);
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml",
        // Not immutable/year-long: a plan can be hidden by moderation after
        // its card has been cached, and the card must stop being served
        // reasonably soon after that.
        "Cache-Control": "public, max-age=86400",
      },
    });
  }
}
