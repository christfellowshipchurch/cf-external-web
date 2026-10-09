import type { LoaderFunctionArgs } from 'react-router';
import { isPreviewMode } from '~/lib/.server/fetch-rock-data';

/**
 * Resource route: serves valid robots.txt so crawlers and check-site-meta get
 * plain text, not the SPA HTML. Must start with a comment or User-agent directive.
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { origin } = new URL(request.url);

  // Preview deployments render Pending/unapproved content and must never be
  // crawled — this is defense-in-depth alongside Vercel Deployment Protection.
  if (isPreviewMode()) {
    return new Response('User-agent: *\nDisallow: /\n', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  }

  const sitemapUrl = `${origin}/sitemap.xml`;
  const body = `User-agent: *
Allow: /

Sitemap: ${sitemapUrl}
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
