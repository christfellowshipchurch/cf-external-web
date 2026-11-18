import {
  AttributeMatrixItem,
  attributeProps,
  attributeValuesProps,
} from '../types/rock-types';
import { createImageUrlFromGuid } from '~/lib/utils';
import {
  buildV2SearchBody,
  escapeDynamicLinq,
  fetchRockV2,
  getSearchItems,
  isRockGuid,
  projectedToV1Shape,
  searchPath,
  selectAttributeValues,
} from './fetch-rock-v2';

/**
 * Escapes a string value for safe interpolation into an OData $filter expression.
 * OData encodes a literal single-quote inside a string operand as two single-quotes ('').
 */
export const escapeOData = (value: string): string => value.replace(/'/g, "''");

export const attributeIsImage = ({
  key,
  attributeValues,
}: {
  key: string;
  attributeValues: attributeValuesProps;
}): boolean => {
  return (
    key.toLowerCase().includes('image') &&
    typeof attributeValues[key].value === 'string'
  ); // looks like an image url
};

export const getImages = ({
  attributeValues,
  attributes,
}: {
  attributeValues: attributeValuesProps;
  attributes: attributeProps;
}) => {
  const imageKeys = Object.keys(attributes).filter((key) =>
    attributeIsImage({
      key,
      attributeValues,
    }),
  );
  return imageKeys.map((key) =>
    createImageUrlFromGuid(attributeValues[key].value),
  );
};

/** Rock's v2 route name for AttributeMatrixItem (and its saved search's key). */
export const MATRIX_ITEMS_V2_MODEL = 'attributematricesitem';

/** v2 read of a matrix's items with their attribute values, in one search. */
export const matrixItemsV2Read = (attributeMatrixGuid: string) => ({
  path: searchPath(MATRIX_ITEMS_V2_MODEL),
  method: 'POST' as const,
  body: buildV2SearchBody({
    where: `AttributeMatrix.Guid == "${escapeDynamicLinq(attributeMatrixGuid)}"`,
    select: `new (Id, Guid, Order, AttributeMatrix.Guid as MatrixGuid, ${selectAttributeValues('AttributeMatrixItem')})`,
    sort: 'Order, Id',
  }),
  map: (data: unknown): AttributeMatrixItem[] => {
    const rows = getSearchItems(data).map((row) =>
      projectedToV1Shape<AttributeMatrixItem & { matrixGuid?: string }>(row),
    );
    // A search whose `where` Rock ignored returns other matrices' items:
    // fail rather than show another matrix's content.
    const wanted = attributeMatrixGuid.toLowerCase();
    if (rows.some((row) => String(row.matrixGuid).toLowerCase() !== wanted)) {
      throw new Error('Matrix item search returned items of another matrix');
    }
    return rows.map(({ matrixGuid: _matrixGuid, ...row }) => row);
  },
});

/** A matrix's items with attribute values, in matrix Order. Empty on any failure. */
export const getAttributeMatrixItems = async ({
  attributeMatrixGuid,
}: {
  attributeMatrixGuid: string;
}): Promise<AttributeMatrixItem[]> => {
  const guid = attributeMatrixGuid.trim();
  if (!isRockGuid(guid)) {
    console.warn(`Attribute matrix guid is malformed: ${guid}`);
    return [];
  }

  try {
    return await fetchRockV2(matrixItemsV2Read(guid));
  } catch (error) {
    // Matrices are page decoration; an empty one shouldn't take the page down.
    console.error(
      `Error fetching attribute matrix items for guid ${guid}: content depending on this matrix will render empty.`,
      error,
    );
    return [];
  }
};
