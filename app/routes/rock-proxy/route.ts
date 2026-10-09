import { type LoaderFunctionArgs } from 'react-router';
import { validateRockUrl } from '~/lib/.server/validate-rock-url';
import { fetchRockProxyHtml, type RockProxyMode } from './rock-proxy.server';

function parseProxyMode(request: Request): RockProxyMode {
  const mode = new URL(request.url).searchParams.get('mode');
  return mode === 'minimal' ? 'minimal' : 'full';
}

export async function loader({ request }: LoaderFunctionArgs) {
  const targetUrl = validateRockUrl(request);
  const mode = parseProxyMode(request);

  try {
    const html = await fetchRockProxyHtml(targetUrl, mode);
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Content-Security-Policy': 'frame-ancestors *',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('Proxy error:', error);
    throw new Response('Failed to proxy content', { status: 500 });
  }
}
