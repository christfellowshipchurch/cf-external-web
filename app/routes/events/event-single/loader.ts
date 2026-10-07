import type { LoaderFunction } from 'react-router';
import { EventSinglePageType, isEventRegistrationGroupType } from './types';
import { RockContentChannelItem } from '~/lib/types/rock-types';
import {
  createImageUrlFromGuid,
  parseRockKeyValueList,
  parseRockValueList,
} from '~/lib/utils';
import { getAttributeMatrixItems } from '~/lib/.server/rock-utils';
import { fetchDefinedValue } from '~/routes/page-builder/loader';
import { fetchEventData, mapSessionScheduleCards } from './utils';

export const loader: LoaderFunction = async ({ params }) => {
  const eventPath = params?.path || '';
  const eventData: RockContentChannelItem | null =
    await fetchEventData(eventPath);

  if (!eventData) {
    throw new Response('Event not found at: /events/' + eventPath, {
      status: 404,
      statusText: 'Not Found',
    });
  }

  const keyInfoCardsRockItems = await getAttributeMatrixItems({
    attributeMatrixGuid: eventData.attributeValues?.keyInfoCards?.value || '',
  });

  const sessionScheduleCardsRockItems = await getAttributeMatrixItems({
    attributeMatrixGuid: eventData.attributeValues?.eventSessions?.value || '',
  });

  const sessionScheduleCards = await mapSessionScheduleCards(
    sessionScheduleCardsRockItems,
  );

  // Optional Blurb and FAQs are Rock Matrix attributes (Header/Content rows),
  // not the pipe/caret "key^value" string format — resolve their rows instead
  // of parsing the raw value (which is just the AttributeMatrix guid).
  const optionalBlurbRockItems = await getAttributeMatrixItems({
    attributeMatrixGuid: eventData.attributeValues?.optionalBlurb?.value || '',
  });

  const faqItemsRockItems = await getAttributeMatrixItems({
    attributeMatrixGuid: eventData.attributeValues?.faqs?.value || '',
  });

  const groupTypeGuid =
    eventData.attributeValues?.groupType?.value?.trim() || '';
  let groupType: EventSinglePageType['groupType'] = undefined;
  if (groupTypeGuid) {
    try {
      const raw = ((await fetchDefinedValue(groupTypeGuid)) || '').trim();
      groupType = isEventRegistrationGroupType(raw) ? raw : undefined;
    } catch {
      groupType = undefined;
    }
  }

  const pageData: EventSinglePageType = {
    title: eventData.title,
    titleOverride: eventData.attributeValues?.titleOverride?.value || '',
    subtitle: eventData?.content || '',
    coverImage: createImageUrlFromGuid(
      eventData.attributeValues?.image?.value || '',
    ),
    heroCtas: parseRockKeyValueList(
      eventData.attributeValues?.heroCtas?.value || '',
    ).map((cta) => ({
      title: cta.key,
      url: cta.value,
    })),
    quickPoints: parseRockValueList(
      decodeURIComponent(eventData.attributeValues?.quickInfoPoints?.value) ||
        '',
    ),
    aboutTitle: eventData.attributeValues?.aboutSectionTitle?.value,
    aboutContent: eventData.attributeValues?.aboutSectionSummary?.value,
    keyInfoCards: keyInfoCardsRockItems.map((item) => ({
      title: item.attributeValues?.title?.value || '',
      description: item.attributeValues?.description?.value || '',
      icon: item.attributeValues?.icon?.value || '',
    })),
    whatToExpect: parseRockKeyValueList(
      eventData.attributeValues?.whatToExpect?.value || '',
    ).map((item) => ({
      title: item.key,
      description: item.value,
    })),
    moreInfoTitle: eventData.attributeValues?.moreInfoTitle?.value,
    moreInfoText: eventData.attributeValues?.moreInfoText?.value,
    optionalBlurb: optionalBlurbRockItems.map((item) => ({
      title: item.attributeValues?.header?.value || '',
      description: item.attributeValues?.content?.value || '',
    })),
    faqItems: faqItemsRockItems.map((item) => ({
      question: item.attributeValues?.header?.value || '',
      answer: item.attributeValues?.content?.value || '',
    })),
    // faqEmail attribute key from Rock Events Content Channel.
    // Optional — falls back to the default contact email when absent.
    faqEmail: eventData.attributeValues?.faqEmail?.value || undefined,
    groupType,
    sessionScheduleCards,
  };

  return pageData;
};
