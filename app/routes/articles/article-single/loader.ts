import { type LoaderFunction } from 'react-router-dom';
import { fetchRockData } from '~/lib/.server/fetch-rock-data';
import { AuthorProps } from './partials/hero.partial';
import { format } from 'date-fns';
import { CallToAction, CollectionItem } from '~/routes/page-builder/types';
import { getBasicAuthorInfoFlexible } from '~/lib/.server/author-utils';
import { getImages } from '~/lib/.server/rock-utils';
import { fetchWistiaDataFromRock } from '~/lib/.server/fetch-wistia-data';
import {
  createImageUrlFromGuid,
  ensureArray,
  parseRockKeyValueList,
} from '~/lib/utils';
import type {
  attributeProps,
  attributeValuesProps,
} from '~/lib/types/rock-types';

export type LoaderReturnType = {
  hostUrl: string;
  title: string;
  id: string;
  content: string;
  summary: string;
  coverImage: string;
  wistiaId?: string;
  author: AuthorProps | null;
  publishDate: string;
  readTime: number;
  callToActionSectionTitle: string;
  callToActionSectionSubtitle: string;
  callsToAction: CallToAction[];
  articlePrimaryCategories: string[];
  relatedArticles?: {
    tag: string;
    tagId: string;
    articles: (CollectionItem & { authorProps?: AuthorProps })[];
  };
};

type RockArticle = {
  id: string | number;
  title: string;
  content?: string;
  startDateTime: string;
  status?: number;
  attributeValues: attributeValuesProps;
  attributes: attributeProps;
};

type RockAlias = { guid: string; personId: number };
type RockPerson = {
  id: number;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  photo?: { guid?: string };
  attributeValues?: attributeValuesProps;
};

const RELATED_ARTICLE_LIMIT = 6;
const RELATED_ARTICLE_FETCH_WINDOW = 30;
const APPROVED_STATUS = 2;
const DEFAULT_AUTHOR_IMAGE =
  'http://cloudfront.christfellowship.church/GetImage.ashx?guid=A62B2B1C-FDFF-44B6-A26E-F1E213285153';
const DEFAULT_AUTHOR: AuthorProps = {
  fullName: 'Christ Fellowship Team',
  photo: { uri: DEFAULT_AUTHOR_IMAGE },
};
const isGuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

async function fetchRelatedAuthors(authorValues: string[]) {
  const uniqueValues = [...new Set(authorValues.filter(Boolean))];
  const guidValues = uniqueValues.filter(isGuid);
  const authors = new Map<string, AuthorProps>();

  if (guidValues.length > 0) {
    const aliases = ensureArray<RockAlias>(
      await fetchRockData({
        endpoint: 'PersonAlias',
        queryParams: {
          $filter: guidValues
            .map((guid) => `Guid eq guid'${guid}'`)
            .join(' or '),
          $select: 'Guid,PersonId',
        },
      }),
    );
    const personIds = [...new Set(aliases.map((alias) => alias.personId))];
    const people = personIds.length
      ? ensureArray<RockPerson>(
          await fetchRockData({
            endpoint: 'People',
            queryParams: {
              $filter: personIds.map((id) => `Id eq ${id}`).join(' or '),
              $expand: 'Photo',
              loadAttributes: 'simple',
            },
          }),
        )
      : [];
    const peopleById = new Map(people.map((person) => [person.id, person]));

    aliases.forEach((alias) => {
      const person = peopleById.get(alias.personId);
      if (!person) return;
      authors.set(alias.guid.toLowerCase(), {
        fullName:
          person.fullName ||
          `${person.firstName || ''} ${person.lastName || ''}`.trim(),
        photo: {
          uri:
            createImageUrlFromGuid(person.photo?.guid || '') ||
            DEFAULT_AUTHOR_IMAGE,
        },
        authorAttributes: {
          authorId: alias.guid,
          pathname: person.attributeValues?.pathname?.value || '',
        },
      });
    });
  }

  const pathnameValues = uniqueValues.filter((value) => !isGuid(value));
  await Promise.all(
    pathnameValues.map(async (value) => {
      const author = (await getBasicAuthorInfoFlexible(value)) as AuthorProps;
      authors.set(value, author);
    }),
  );

  return authors;
}

export async function fetchRelatedArticles(
  article: RockArticle,
): Promise<LoaderReturnType['relatedArticles']> {
  const categoryGuid = article.attributeValues.primaryCategory?.value
    ?.split(',')[0]
    ?.trim();
  const categoryName = article.attributeValues.primaryCategory?.valueFormatted
    ?.split(',')[0]
    ?.trim();
  if (!categoryGuid || !categoryName) return undefined;

  const response = await fetchRockData({
    endpoint: 'ContentChannelItems/GetByAttributeValue',
    queryParams: {
      attributeKey: 'PrimaryCategory',
      value: categoryGuid,
      $filter: `ContentChannelId eq 43 and Status eq 'Approved' and Id ne ${article.id}`,
      $orderby: 'StartDateTime desc',
      $top: String(RELATED_ARTICLE_FETCH_WINDOW),
      loadAttributes: 'simple',
    },
    filterByDateRange: true,
  });

  const related = ensureArray<RockArticle>(response || [])
    .filter((item) => item.status === APPROVED_STATUS)
    .filter((item) => String(item.id) !== String(article.id))
    .filter((item) =>
      item.attributeValues.primaryCategory?.value
        ?.split(',')
        .map((value) => value.trim())
        .includes(categoryGuid),
    )
    .sort(
      (a, b) =>
        new Date(b.startDateTime).getTime() -
        new Date(a.startDateTime).getTime(),
    )
    .slice(0, RELATED_ARTICLE_LIMIT);

  if (related.length === 0) {
    return { tag: categoryName, tagId: categoryGuid, articles: [] };
  }

  const authors = await fetchRelatedAuthors(
    related.map((item) => item.attributeValues.author?.value || ''),
  );

  return {
    tag: categoryName,
    tagId: categoryGuid,
    articles: related.map((item) => ({
      id: String(item.id),
      contentChannelId: '43',
      contentType: 'ARTICLES',
      name: item.title,
      summary: item.attributeValues.summary?.value || '',
      image:
        getImages({
          attributeValues: item.attributeValues,
          attributes: item.attributes,
        })[0] || '',
      pathname: item.attributeValues.url?.value || '',
      startDate: format(new Date(item.startDateTime), 'd MMM yyyy'),
      readTime: Math.max(
        1,
        Math.round((item.content || '').split(' ').length / 200),
      ),
      authorProps:
        authors.get(
          isGuid(item.attributeValues.author?.value || '')
            ? (item.attributeValues.author?.value || '').toLowerCase()
            : item.attributeValues.author?.value || '',
        ) || DEFAULT_AUTHOR,
    })),
  };
}

const fetchArticleData = async (articlePath: string) => {
  try {
    const rockData = await fetchRockData({
      endpoint: 'ContentChannelItems/GetByAttributeValue',
      queryParams: {
        attributeKey: 'Pathname', //TODO: decide whether to use Url or Pathname for all content channels
        $filter: "ContentChannelId eq 43 and Status eq 'Approved'",
        value: articlePath,
        loadAttributes: 'simple',
      },
      filterByDateRange: true,
    });

    if (!rockData || rockData.length === 0) {
      return null;
    }

    if (rockData.length > 1) {
      console.error(
        `More than one article was found with the same path: /articles/${articlePath}`,
      );
      return rockData[0];
    }

    return rockData;
  } catch (error) {
    console.error('Error fetching article data:', error);
    throw new Response(
      `Failed to fetch article data for path: ${articlePath}`,
      {
        status: 404,
        statusText: 'Not Found',
      },
    );
  }
};

export const loader: LoaderFunction = async ({ params, request }) => {
  const articlePath = params?.path || '';
  const origin = new URL(request.url).origin;

  const articleData = await fetchArticleData(articlePath);
  if (!articleData) {
    throw new Response('Article not found at: /articles/' + articlePath, {
      status: 404,
      statusText: 'Not Found',
    });
  }

  const { title, content, startDateTime, attributeValues, attributes } =
    articleData;

  const callToActionSectionTitle =
    attributeValues?.callToActionSectionTitle?.value || '';
  const callToActionSectionSubtitle =
    attributeValues?.callToActionSectionSubtitle?.value || '';
  const callsToAction = parseRockKeyValueList(
    attributeValues?.callsToAction?.value || '',
  ).map(({ key, value }) => ({
    title: key,
    url: value,
  }));

  const articlePrimaryCategories =
    attributeValues.primaryCategory?.valueFormatted.split(',');
  const coverImage = getImages({ attributeValues, attributes });
  const { summary, author } = attributeValues;

  const mediaGuid = attributeValues?.media?.value;
  const [authorDetails, relatedArticles, wistiaId] = await Promise.all([
    author?.value
      ? getBasicAuthorInfoFlexible(author.value)
      : Promise.resolve(null),
    fetchRelatedArticles(articleData),
    mediaGuid
      ? fetchWistiaDataFromRock(mediaGuid)
          .then((mediaElement) => mediaElement?.sourceKey || undefined)
          .catch((error) => {
            console.error('Error fetching Wistia data:', error);
            return undefined;
          })
      : Promise.resolve(undefined),
  ]);

  const pageData: LoaderReturnType = {
    hostUrl: origin,
    title,
    id: articleData.id,
    content,
    summary: summary.value,
    coverImage: coverImage[0],
    wistiaId,
    author: {
      fullName: authorDetails?.fullName || '',
      photo: {
        uri: authorDetails?.photo?.uri || '',
      },
      authorAttributes: authorDetails?.authorAttributes || undefined,
    },
    publishDate: format(new Date(startDateTime), 'd MMM yyyy'),
    readTime: Math.max(1, Math.round(content.split(' ').length / 200)),
    articlePrimaryCategories,
    callToActionSectionTitle,
    callToActionSectionSubtitle,
    callsToAction,
    relatedArticles,
  };

  return pageData;
};
