import { LoaderFunction } from 'react-router';
import { createImageUrlFromGuid } from '~/lib/utils';
import { format } from 'date-fns';
import { AuthorArticleProps, AuthorLoaderData, SocialMedia } from './types';
import {
  fetchAuthorData,
  fetchPersonAliasGuid,
  fetchAuthorArticles,
  fetchAuthorId,
  fetchAuthorByPathname,
} from '~/lib/.server/author-utils';

interface ArticleData {
  title: string;
  content?: string;
  startDateTime: string;
  attributeValues?: {
    image?: { value: string };
    summary?: { value: string };
    url?: { value: string };
  };
}

interface RockAttributeValue {
  value?: string | null;
  valueFormatted?: string | null;
}

function getHtmlAttributeValue(attribute?: RockAttributeValue) {
  return attribute?.valueFormatted?.trim() || attribute?.value || '';
}

// Utility function to check if a string is a GUID
const isGuid = (str: string): boolean => {
  const guidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidRegex.test(str);
};

export const getAuthorDetailsByPathname = async (pathname: string) => {
  try {
    // Fetch author data using pathname
    const authorData = await fetchAuthorByPathname(pathname);

    if (!authorData) {
      throw new Response(`Author not found for pathname: ${pathname}`, {
        status: 404,
        statusText: 'Not Found',
      });
    }

    // Get the author's GUID for fetching articles
    const personAliasGuid = await fetchPersonAliasGuid(
      authorData?.primaryAliasId,
    );

    if (!personAliasGuid) {
      throw new Response(`Person alias GUID not found`, {
        status: 404,
        statusText: 'Not Found',
      });
    }

    // Get articles by the author
    const authorArticles: ArticleData[] =
      await fetchAuthorArticles(personAliasGuid);

    // Get the author's social links with null checks
    const socialLinks = [
      {
        url: authorData?.attributeValues?.twitter?.value || null,
        type: 'twitter',
      },
      {
        url: authorData?.attributeValues?.facebook?.value || null,
        type: 'facebook',
      },
      {
        url: authorData?.attributeValues?.instagram?.value || null,
        type: 'instagram',
      },
      {
        url: authorData?.attributeValues?.linkedIn?.value || null,
        type: 'linkedIn',
      },
    ].filter((link): link is SocialMedia => link.url != null);

    return {
      id: authorData.id,
      fullName:
        authorData.fullName || `${authorData.firstName} ${authorData.lastName}`,
      photo: {
        uri: createImageUrlFromGuid(authorData.photo?.guid) || null,
      },
      authorAttributes: {
        bio: getHtmlAttributeValue(authorData?.attributeValues?.authorBio),
        authorId: authorData.id,
        jobTitle: authorData?.attributeValues?.jobTitle?.value || '',
        socialLinks,
        publications: {
          articles: authorArticles
            .map((article: ArticleData): AuthorArticleProps | null => {
              if (!article) return null;

              try {
                return {
                  title: article.title || '',
                  readTime: Math.max(
                    1,
                    Math.round(
                      (article.content?.split(' ') || []).length / 200,
                    ),
                  ),
                  publishDate: format(
                    new Date(article?.startDateTime),
                    'd MMM yyyy',
                  ),
                  coverImage:
                    createImageUrlFromGuid(
                      article.attributeValues?.image?.value || '',
                    ) || '',
                  summary: article.attributeValues?.summary?.value || '',
                  url: article.attributeValues?.url?.value || '',
                };
              } catch (error) {
                console.error('Error processing article:', error);
                return null;
              }
            })
            .filter(
              (article): article is AuthorArticleProps => article != null,
            ),
          books: [],
          podcasts: [],
        },
        pathname: authorData?.attributeValues?.pathname?.value || '',
      },
    };
  } catch (error) {
    console.error('Error in getAuthorDetailsByPathname:', error);
    throw new Response(`Failed to fetch author details`, {
      status: 404,
      statusText: 'Not Found',
    });
  }
};

export const getAuthorDetails = async (personId: string) => {
  try {
    let authorData;
    let personAliasGuid;

    // Check if the personId is a GUID
    if (isGuid(personId)) {
      // If it's a GUID, get the PersonId first, then fetch author data
      const authorIdResult = await fetchAuthorId(personId);
      if (!authorIdResult?.personId) {
        throw new Response(`Author ID not found for GUID`, {
          status: 404,
          statusText: 'Not Found',
        });
      }

      authorData = await fetchAuthorData({
        authorId: authorIdResult.personId,
      });

      // For GUID-based lookups, we can use the GUID directly for articles
      personAliasGuid = personId;
    } else {
      // Original logic for non-GUID IDs
      authorData = await fetchAuthorData({
        authorId: personId,
      });

      if (!authorData) {
        throw new Response(`Author data not found`, {
          status: 404,
          statusText: 'Not Found',
        });
      }

      // Get the author's GUID
      personAliasGuid = await fetchPersonAliasGuid(authorData?.primaryAliasId);

      if (!personAliasGuid) {
        throw new Response(`Person alias GUID not found`, {
          status: 404,
          statusText: 'Not Found',
        });
      }
    }

    if (!authorData) {
      throw new Response(`Author data not found`, {
        status: 404,
        statusText: 'Not Found',
      });
    }

    // Get articles by the author
    const authorArticles: ArticleData[] =
      await fetchAuthorArticles(personAliasGuid);

    // Get the author's social links with null checks
    const socialLinks = [
      {
        url: authorData?.attributeValues?.twitter?.value || null,
        type: 'twitter',
      },
      {
        url: authorData?.attributeValues?.facebook?.value || null,
        type: 'facebook',
      },
      {
        url: authorData?.attributeValues?.instagram?.value || null,
        type: 'instagram',
      },
      {
        url: authorData?.attributeValues?.linkedIn?.value || null,
        type: 'linkedIn',
      },
    ].filter((link): link is SocialMedia => link.url != null);

    return {
      id: authorData.id,
      fullName:
        authorData.fullName || `${authorData.firstName} ${authorData.lastName}`,
      photo: {
        uri: createImageUrlFromGuid(authorData.photo?.guid) || null,
      },
      authorAttributes: {
        bio: getHtmlAttributeValue(authorData?.attributeValues?.authorBio),
        authorId: personId,
        jobTitle: authorData?.attributeValues?.jobTitle?.value || '',
        socialLinks,
        publications: {
          articles: authorArticles
            .map((article: ArticleData): AuthorArticleProps | null => {
              if (!article) return null;

              try {
                return {
                  title: article.title || '',
                  readTime: Math.max(
                    1,
                    Math.round(
                      (article.content?.split(' ') || []).length / 200,
                    ),
                  ),
                  publishDate: format(
                    new Date(article?.startDateTime),
                    'd MMM yyyy',
                  ),
                  coverImage:
                    createImageUrlFromGuid(
                      article.attributeValues?.image?.value || '',
                    ) || '',
                  summary: article.attributeValues?.summary?.value || '',
                  url: article.attributeValues?.url?.value || '',
                };
              } catch (error) {
                console.error('Error processing article:', error);
                return null;
              }
            })
            .filter(
              (article): article is AuthorArticleProps => article != null,
            ),
          books: [],
          podcasts: [],
        },
        pathname: authorData?.attributeValues?.pathname?.value || '',
      },
    };
  } catch (error) {
    console.error('Error in getAuthorDetails:', error);
    throw new Response(`Failed to fetch author details`, {
      status: 404,
      statusText: 'Not Found',
    });
  }
};

export const loader: LoaderFunction = async ({ request, params }) => {
  const authorPathname = params?.authorId || '';

  // Use the new pathname-based approach
  const data = await getAuthorDetailsByPathname(authorPathname);

  if (!data) {
    // This should stop execution and propagate the error to Remix's error boundary
    throw new Response('Author not found at: /author/' + authorPathname, {
      status: 404,
      statusText: 'Not Found',
    });
  }

  const origin = new URL(request.url).origin;

  const authorData: AuthorLoaderData = {
    id: data.id,
    fullName: data.fullName,
    profilePhoto: data.photo.uri ?? '',
    authorAttributes: data.authorAttributes,
    hostUrl: origin,
  };

  return authorData;
};
