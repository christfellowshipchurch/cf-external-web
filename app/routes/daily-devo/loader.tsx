import { LoaderFunction } from 'react-router';
import https from 'https';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { createImageUrlFromGuid } from '~/lib/utils';
import { TTL } from '~/lib/.server/fetch-rock-data';
import { parseRockDateTime } from '~/lib/.server/rock-datetime';

export type DailyDevo = {
  title: string;
  content: string;
  startDateTime: string;
  wistiaId: string;
  coverImage: string;
  scriptures: {
    reference: string;
    text: string;
    translation_id: string;
  }[];
};

export type LoaderReturnType = {
  appPromoVideo: string;
  avatars: { src: string; alt: string }[];
  dailyDevo: DailyDevo;
};

const httpsAgent = new https.Agent({
  rejectUnauthorized: process.env.NODE_ENV === 'production',
});

const fetchScripture = async (scripture: string) => {
  try {
    const url = `https://bible-api.com/${scripture}`;
    const data = await new Promise<string>((resolve, reject) => {
      https
        .get(url, { agent: httpsAgent }, (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => resolve(body));
        })
        .on('error', reject);
    });

    return JSON.parse(data) as {
      reference: string;
      text: string;
      translation_id: string;
    };
  } catch {
    return {
      reference: scripture,
      text: 'Scripture text unavailable',
      translation_id: 'unknown',
    };
  }
};

const fetchDailyDevo = async () => {
  const contentChannelId = 136;

  const dailyDevoItems = await fetchRockData({
    endpoint: 'ContentChannelItems',
    queryParams: {
      $filter: `ContentChannelId eq ${contentChannelId}`,
      $orderby: 'StartDateTime desc',
      $top: '14', // Fetch 2 weeks of items to ensure we get the most recent one, sometimnes items are made ahead of time
      loadAttributes: 'simple',
    },
    ttl: TTL.NONE,
    filterByDateRange: true,
  });

  // Filter to get the most recent item that has started (StartDateTime <= current date)
  const currentDate = new Date();
  const validItems = dailyDevoItems.filter(
    (item: { startDateTime: string }) => {
      const startDate = parseRockDateTime(item.startDateTime);
      return startDate <= currentDate;
    },
  );

  return validItems[0]; // Return the most recent valid item
};

const normalizeDailyDevoContent = (content: string) =>
  content.replace(
    'J*esus, search my heart, and show me if I’m treating anyone like my enemy.*',
    '*Jesus, search my heart, and show me if I’m treating anyone like my enemy.*',
  );

const avatars = [
  { src: 'https://picsum.photos/id/1011/70/70', alt: 'Avatar 1' },
  { src: 'https://picsum.photos/id/1012/70/70', alt: 'Avatar 2' },
  { src: 'https://picsum.photos/id/1015/70/70', alt: 'Avatar 3' },
  { src: 'https://picsum.photos/id/1015/70/70', alt: 'Avatar 4' },
];

export const loader: LoaderFunction = async (): Promise<LoaderReturnType> => {
  const dailyDevoRockData = await fetchDailyDevo();
  const scripturesRockData = dailyDevoRockData.attributeValues.scriptures.value
    .split(',')
    .map((s: string) => s.trim());

  const scriptures = await Promise.all(
    scripturesRockData.map((scripture: string) => fetchScripture(scripture)),
  );

  const appPromoVideo = 'b8qb27ar32';

  const dailyDevo = {
    title: dailyDevoRockData.title,
    content: normalizeDailyDevoContent(dailyDevoRockData.content),
    startDateTime: dailyDevoRockData.startDateTime,
    wistiaId: dailyDevoRockData.attributeValues.media.value,
    coverImage: await createImageUrlFromGuid(
      dailyDevoRockData.attributeValues.image.value,
    ),
    scriptures,
  };

  return { appPromoVideo, avatars, dailyDevo };
};
