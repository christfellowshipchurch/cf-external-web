import { fetchContentItems } from '~/lib/.server/rock-content-items';
import { fetchCampusesWithDetails } from '~/lib/.server/rock-campuses';
import { createImageUrlFromGuid, parseRockKeyValueList } from '~/lib/utils';
import {
  fetchChildItems,
  fetchDefinedValue,
  mapPageBuilderChildItems,
} from '../page-builder/loader';
import { MinistryService, PageBuilderLoader } from '../page-builder/types';
import { RockCampus, RockCampuses } from '~/lib/rock-config';
import { getAttributeMatrixItems } from '~/lib/.server/rock-utils';
import { AttributeMatrixItem } from '~/lib/types/rock-types';

export const fetchMinistryServices = async () => {
  const allCampuses = await fetchCampusesWithDetails({ active: true });

  const campusServicesGuids = allCampuses
    .map((campus) => {
      return {
        name: campus.name,
        servicesGuid:
          campus.attributeValues?.weeklyMinistryServices?.value ?? '',
      };
    })
    .filter(
      (campus: { servicesGuid: string }) =>
        !!campus.servicesGuid && campus.servicesGuid !== '',
    );

  const campusMinistryServices = await Promise.all(
    campusServicesGuids.map(
      async (campus: { name: string; servicesGuid: string }) => {
        const currentCampus = campus.name;
        const matrixItems = await getAttributeMatrixItems({
          attributeMatrixGuid: campus.servicesGuid,
        });

        const ministryServices: MinistryService[] = await Promise.all(
          matrixItems.map(async (matrixItem: AttributeMatrixItem) => {
            const attributeValues = matrixItem.attributeValues;
            const ministryTypeGuid = attributeValues?.ministryType?.value;
            const ministryType = ministryTypeGuid
              ? ((await fetchDefinedValue(
                  ministryTypeGuid,
                )) as MinistryService['ministryType'])
              : ('' as MinistryService['ministryType']);

            const ministryService: MinistryService = {
              id: matrixItem.guid,
              ministryType,
              location: RockCampuses.find(
                (campus: RockCampus) => campus.name === currentCampus,
              ) as RockCampus,
              daysOfWeek: attributeValues?.dayOfTheWeek?.valueFormatted ?? '',
              times: attributeValues?.serviceTimes?.value ?? '',
              learnMoreLink: attributeValues?.learnMoreUrl?.value || undefined,
              planAVisit:
                attributeValues?.planMyVisit?.valueFormatted?.toLowerCase() ===
                  'on' ||
                attributeValues?.planMyVisit?.value?.toLowerCase() === 'true' ||
                false,
            };

            return ministryService;
          }),
        );

        return ministryServices;
      },
    ),
  );

  return campusMinistryServices.flat();
};

export const loader = async ({
  params,
}: {
  params: { path?: string };
}): Promise<PageBuilderLoader> => {
  try {
    const pathname = params?.path;

    if (!pathname) {
      throw new Response('Pathname is required', {
        status: 400,
        statusText: 'Bad Request',
      });
    }

    const pageData = await fetchContentItems({
      endpoint: 'ContentChannelItems/GetByAttributeValue',
      queryParams: {
        attributeKey: 'Pathname',
        value: pathname,
        loadAttributes: 'simple',
        $filter: "ContentChannelId eq 171 and Status eq 'Approved'",
      },
      filterByDateRange: true,
    });

    if (!pageData) {
      throw new Response(`Page not found with pathname: ${pathname}`, {
        status: 404,
        statusText: 'Not Found',
      });
    }

    const children = await fetchChildItems(pageData.id);
    const mappedChildren = await mapPageBuilderChildItems(children);

    const campusMinistryServices = await fetchMinistryServices();

    const pageBuilder: PageBuilderLoader = {
      title: pageData.title,
      heroImage:
        createImageUrlFromGuid(pageData.attributeValues?.image?.value) || '',
      content: pageData.content,
      callsToAction:
        parseRockKeyValueList(
          pageData.attributeValues?.callsToAction?.value,
        )?.map((cta) => ({
          title: cta.key,
          url: cta.value,
        })) || [],
      sections: mappedChildren,
      services: campusMinistryServices,
    };

    return pageBuilder;
  } catch (error) {
    console.error('Error in page builder loader:', error);
    throw new Response('Failed to load page content', {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
};
