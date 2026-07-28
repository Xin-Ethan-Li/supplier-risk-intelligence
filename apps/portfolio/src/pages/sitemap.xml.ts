import type { APIRoute } from "astro";

const pages = [
  "",
  "about/",
  "projects/",
  "projects/supplier-risk-intelligence/",
  "resume/",
];

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL("http://localhost:4322");
  const base = import.meta.env.BASE_URL;
  const urls = pages
    .map((path) => `<url><loc>${new URL(`${base}${path}`, origin)}</loc></url>`)
    .join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
