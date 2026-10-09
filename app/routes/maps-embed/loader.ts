import { LoaderFunction } from 'react-router';

export const loader: LoaderFunction = async ({ request }) => {
  const url = new URL(request.url);
  const address = url.searchParams.get('address');

  if (!address) {
    throw new Response('address parameter required', { status: 400 });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Response('Maps not configured', { status: 503 });
  }

  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(address)}`;

  return new Response(null, {
    status: 302,
    headers: { Location: embedUrl },
  });
};
