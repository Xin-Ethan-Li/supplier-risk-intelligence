import type { APIRoute } from "astro";

export const GET: APIRoute = ({ site }) => {
  const origin = site ?? new URL("http://localhost:4322");
  const base = import.meta.env.BASE_URL;
  return new Response(
    `User-agent: *\nAllow: ${base}\nSitemap: ${new URL(`${base}sitemap.xml`, origin)}\n`,
    {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    },
  );
};
