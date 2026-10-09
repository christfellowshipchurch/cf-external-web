import { type LoaderFunctionArgs } from 'react-router';
import {
  validateRockUrl,
  validateRockUrlString,
} from '~/lib/.server/validate-rock-url';
import { buildRockPageEmbedUrl } from './rock-page.data';

export async function loader({ request }: LoaderFunctionArgs) {
  const requestUrl = new URL(request.url);
  const embed = requestUrl.searchParams.get('embed')?.trim();

  if (embed) {
    return {
      embed,
      url: validateRockUrlString(
        buildRockPageEmbedUrl(embed, requestUrl.searchParams),
      ),
    };
  }

  return { embed: null, url: validateRockUrl(request) };
}
