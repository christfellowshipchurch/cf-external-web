import type { LoaderFunctionArgs } from 'react-router';

/**
 * Resource route: serves LLMs.txt (LLM-friendly site overview) as plain text
 * so AI crawlers and check-site-meta get markdown content, not the SPA HTML.
 * See https://llmstxt.org/
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const { origin } = new URL(request.url);

  const body = `# Christ Fellowship Church

> Christ Fellowship is a multisite church in South Florida (Palm Beach, Broward, Miami) with in-person campuses, church online, and resources to help people grow in faith through services, groups, and ministries.

Christ Fellowship Church offers weekend services, small groups, volunteer opportunities, and ministries for all ages. The website provides information about locations, events, messages, podcasts, and ways to give or get connected.

## Main sections

- [About](${origin}/about): Who we are, beliefs, and leadership
- [Locations](${origin}/locations): Campus addresses and service times
- [Services & messages](${origin}/messages): Sermons and message series
- [Events](${origin}/events): Upcoming events and registration
- [Give](${origin}/give): Giving and generosity
- [Ministries](${origin}/ministries): Ministries and ways to serve
- [Group finder](${origin}/group-finder): Find small groups and community
- [Volunteer](${origin}/volunteer): Volunteer opportunities
- [Podcasts](${origin}/podcasts): Podcast shows and episodes

## Optional

- [Connect card](${origin}/connect-card): Get connected or request information
- [Next steps](${origin}/next-steps): Spiritual next steps
`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
