import { fetchCampuses } from '~/lib/.server/rock-campuses';
import { fetchDefinedValues } from '~/lib/.server/rock-defined-values';

export type ConnectCardDataType = {
  campuses: string[];
  allThatApplies: { guid: string; value: string }[];
};

export const fetchConnectCardData = async () => {
  const ALL_THAT_APPLIES_ID = 389; //Rock Define Type ID
  const rockDefineTypes = await fetchDefinedValues<
    ConnectCardDataType['allThatApplies'][number]
  >({
    definedTypeId: ALL_THAT_APPLIES_ID,
    fields: ['Guid', 'Value'],
  });

  const campuses = await fetchCampuses<{ name: string }>({ active: true }, [
    'Name',
  ]);

  const formData: ConnectCardDataType = {
    campuses: campuses.map((campus: { name: string }) => campus.name),
    allThatApplies: rockDefineTypes,
  };

  return <ConnectCardDataType>formData;
};
