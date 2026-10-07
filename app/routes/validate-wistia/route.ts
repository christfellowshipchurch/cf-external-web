import { isValidWistiaId } from '~/lib/.server/fetch-wistia-data';
import type { LoaderFunctionArgs } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const videoId = url.searchParams.get('videoId');

  if (!videoId) {
    return Response.json({ isValid: false }, { status: 400 });
  }

  const isValid = await isValidWistiaId(videoId);

  return Response.json({ isValid });
}
