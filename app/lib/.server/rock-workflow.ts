import {
  fetchRockData,
  patchRockData,
  postRockData,
  TTL,
} from './fetch-rock-data';
import { rockV1LaunchWorkflowPath, WorkflowTypeGuids } from '~/lib/rock-config';
import { RockAPIError } from './error-types';
import { isRockV2Enabled, sendRockV2 } from './fetch-rock-v2';
import { escapeOData } from './rock-utils';

/**
 * Person Alias ID for the Rock person tied to the REST API key.
 * Set API_ALIAS_PERSON_ID in env (integer PersonAlias.Id, not Person.Id or GUID).
 */
export const getRockApiPersonAliasId = (): string => {
  const raw = process.env.API_ALIAS_PERSON_ID?.trim();
  if (raw && /^\d+$/.test(raw)) {
    return raw;
  }
  return '0';
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Rock LaunchWorkflow/0 enqueues a background job; workflows often appear 30–60s later. */
const INITIATOR_PATCH_MAX_ATTEMPTS = 90;
const INITIATOR_PATCH_DELAY_MS = 1000;

/**
 * Rock's v1 LaunchWorkflow REST action does not set InitiatorPersonAliasId (it
 * always passes null). PATCH the workflow after it exists so the entry list
 * shows the API person as initiator.
 */
export const assignRockWorkflowInitiator = async (
  workflowId: number,
  personAliasId: string,
): Promise<void> => {
  await patchRockData({
    endpoint: `Workflows/${workflowId}`,
    body: { InitiatorPersonAliasId: Number(personAliasId) },
  });
};

/**
 * Prefer PersonAlias/LaunchWorkflow when we know the API person alias — Rock
 * processes it faster than Workflows/LaunchWorkflow/0 (~15s vs ~40s in testing).
 */
export const buildRockWorkflowLaunchEndpoint = (
  workflowTypeId: string,
  workflowName: string,
): string => {
  const initiatorAliasId = getRockApiPersonAliasId();

  if (initiatorAliasId !== '0') {
    return `PersonAlias/LaunchWorkflow/${initiatorAliasId}?workflowTypeId=${workflowTypeId}&workflowName=${encodeURIComponent(workflowName)}`;
  }

  return rockV1LaunchWorkflowPath(workflowTypeId, workflowName);
};

interface FindLaunchedWorkflowOptions {
  workflowTypeId: string;
  workflowIdAfter: number;
  workflowName?: string;
  maxAttempts?: number;
  delayMs?: number;
}

const firstWorkflowRow = (
  rows: unknown,
): { id?: number; Id?: number } | null => {
  if (Array.isArray(rows)) {
    return rows[0] ?? null;
  }
  if (rows && typeof rows === 'object') {
    return rows as { id?: number; Id?: number };
  }
  return null;
};

export const getLatestWorkflowIdForType = async (
  workflowTypeId: string,
): Promise<number> => {
  const rows = await fetchRockData({
    endpoint: 'Workflows',
    queryParams: {
      $filter: `WorkflowTypeId eq ${workflowTypeId}`,
      $orderby: 'Id desc',
      $top: '1',
      $select: 'Id',
    },
    ttl: TTL.NONE,
  });

  const row = firstWorkflowRow(rows);
  const id = row?.id ?? row?.Id;
  return id != null ? Number(id) : 0;
};

export const findLaunchedWorkflowId = async ({
  workflowTypeId,
  workflowIdAfter,
  workflowName,
  maxAttempts = INITIATOR_PATCH_MAX_ATTEMPTS,
  delayMs = INITIATOR_PATCH_DELAY_MS,
}: FindLaunchedWorkflowOptions): Promise<number | null> => {
  const baseFilter = `WorkflowTypeId eq ${workflowTypeId} and Id gt ${workflowIdAfter} and InitiatorPersonAliasId eq null`;

  const filters = workflowName
    ? [`${baseFilter} and Name eq '${escapeOData(workflowName)}'`, baseFilter]
    : [baseFilter];

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    for (const filter of filters) {
      const rows = await fetchRockData({
        endpoint: 'Workflows',
        queryParams: {
          $filter: filter,
          $orderby: 'Id desc',
          $top: '1',
          $select: 'Id',
        },
        ttl: TTL.NONE,
      });

      const row = firstWorkflowRow(rows);
      const id = row?.id ?? row?.Id;
      if (id != null) {
        return Number(id);
      }
    }

    await sleep(delayMs);
  }

  return null;
};

export const assignInitiatorWhenWorkflowAppears = async ({
  workflowTypeId,
  workflowIdAfter,
  workflowName,
  initiatorPersonAliasId,
  maxAttempts,
  delayMs,
}: {
  workflowTypeId: string;
  workflowIdAfter: number;
  workflowName?: string;
  initiatorPersonAliasId: string;
  maxAttempts?: number;
  delayMs?: number;
}): Promise<boolean> => {
  const workflowId = await findLaunchedWorkflowId({
    workflowTypeId,
    workflowIdAfter,
    workflowName,
    maxAttempts,
    delayMs,
  });

  if (workflowId == null) {
    console.error(
      `[rock-workflow] Timed out waiting for workflow type ${workflowTypeId} (after id ${workflowIdAfter}) to assign initiator ${initiatorPersonAliasId}. Rock's LaunchWorkflow job may still be queued.`,
    );
    return false;
  }

  await assignRockWorkflowInitiator(workflowId, initiatorPersonAliasId);
  return true;
};

interface PostRockWorkflowLaunchOptions {
  workflowTypeId: string;
  workflowName: string;
  body: Record<string, unknown>;
  /** Rock instance name, often "{FirstName} {LastName}" from the entry form. */
  instanceName?: string;
}

const logBackgroundPatchFailure = (err: unknown) => {
  console.error('[rock-workflow] Background initiator patch failed:', err);
};

/**
 * Run initiator PATCH after the HTTP response is sent so form submissions are not
 * blocked on Rock's async LaunchWorkflow job (~15–45s).
 *
 * Works while the server process stays alive (local dev, `react-router-serve`).
 */
export const scheduleRockWorkflowBackgroundWork = (
  work: Promise<boolean>,
): void => {
  void work.catch(logBackgroundPatchFailure);
};

/**
 * Rock answers these before it looks at the workflow, so v1 can launch safely.
 * Not 400: Rock may answer it after the workflow was saved.
 */
const V2_NOT_LAUNCHED_STATUSES = new Set([401, 403, 404]);

/** v1's launch reads its body as strings, turning `true` into "True". */
const toWorkflowAttributeValues = (
  body: Record<string, unknown>,
): Record<string, string> =>
  Object.fromEntries(
    Object.entries(body)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [
        key,
        typeof value === 'boolean'
          ? value
            ? 'True'
            : 'False'
          : String(value ?? ''),
      ]),
  );

/**
 * Launches on Rock v2 in the background, as v1 does. v2 sets the initiator to
 * the REST user, so there is nothing to patch afterwards. Returns false when
 * v1 should launch instead: v2 is off, the type has no Guid, or Rock refused
 * before launching. Throws when the launch may have gone through, so it's
 * never launched twice.
 */
const launchOnRockV2 = async (
  workflowTypeId: string,
  workflowName: string,
  body: Record<string, unknown>,
): Promise<boolean> => {
  if (!isRockV2Enabled()) return false;
  const typeGuid = WorkflowTypeGuids[workflowTypeId];
  if (!typeGuid) {
    console.warn(
      `⚠️ Workflow type ${workflowTypeId} has no Guid in WorkflowTypeGuids, launching on v1`,
    );
    return false;
  }
  // v2 takes text values only; v1 gets the JSON as it always has.
  const nonTextKey = Object.keys(body).find(
    (key) => body[key] !== null && typeof body[key] === 'object',
  );
  if (nonTextKey) {
    console.warn(
      `⚠️ Workflow type ${workflowTypeId} has a non-text value in ${nonTextKey}, launching on v1`,
    );
    return false;
  }

  try {
    await sendRockV2('POST', `workflows/actions/launch/${typeGuid}`, {
      name: workflowName,
      attributeValues: toWorkflowAttributeValues(body),
    });
    return true;
  } catch (error) {
    if (
      error instanceof RockAPIError &&
      V2_NOT_LAUNCHED_STATUSES.has(error.statusCode)
    ) {
      console.error(
        `⚠️ Rock v2 refused workflow type ${workflowTypeId} (${error.statusCode}), launching on v1`,
      );
      return false;
    }
    throw error;
  }
};

/** Launches a workflow on v2, or on v1's `Workflows/LaunchWorkflow/0`. */
export const launchRockWorkflow = async ({
  workflowTypeId,
  workflowName,
  body,
}: Omit<PostRockWorkflowLaunchOptions, 'instanceName'>): Promise<void> => {
  if (await launchOnRockV2(workflowTypeId, workflowName, body)) return;

  await postRockData({
    endpoint: rockV1LaunchWorkflowPath(workflowTypeId, workflowName),
    body,
  });
};

/**
 * Launches on v2 (initiator: the REST user), or on v1 and then patches the
 * initiator to API_ALIAS_PERSON_ID in the background.
 */
export const postRockWorkflowLaunchWithApiInitiator = async ({
  workflowTypeId,
  workflowName,
  body,
  instanceName,
}: PostRockWorkflowLaunchOptions): Promise<void> => {
  if (await launchOnRockV2(workflowTypeId, workflowName, body)) return;

  const initiatorPersonAliasId = getRockApiPersonAliasId();
  const workflowIdAfter = await getLatestWorkflowIdForType(workflowTypeId);
  const endpoint = buildRockWorkflowLaunchEndpoint(
    workflowTypeId,
    workflowName,
  );

  await postRockData({ endpoint, body });

  if (initiatorPersonAliasId === '0') {
    return;
  }

  scheduleRockWorkflowBackgroundWork(
    assignInitiatorWhenWorkflowAppears({
      workflowTypeId,
      workflowIdAfter,
      workflowName: instanceName,
      initiatorPersonAliasId,
    }),
  );
};
