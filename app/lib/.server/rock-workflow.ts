import { WorkflowTypeGuids } from '~/lib/rock-config';
import { sendRockV2 } from './fetch-rock-v2';

interface LaunchRockWorkflowOptions {
  workflowTypeId: string;
  workflowName: string;
  body: Record<string, unknown>;
}

/** Rock reads launch values as strings: booleans as `True`/`False`, `null` as `""`. */
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
 * Launches a workflow on Rock v2, in the background (Rock answers 204 and runs
 * it within a minute). The initiator is the REST user. Any failure throws and
 * is never retried, since Rock may already have saved the workflow.
 */
export const launchRockWorkflow = async ({
  workflowTypeId,
  workflowName,
  body,
}: LaunchRockWorkflowOptions): Promise<void> => {
  // v2 paths take a Guid; add new types to WorkflowTypeGuids.
  const typeGuid = WorkflowTypeGuids[workflowTypeId];
  if (!typeGuid) {
    throw new Error(
      `Workflow type ${workflowTypeId} has no Guid in WorkflowTypeGuids`,
    );
  }
  const nonTextKey = Object.keys(body).find(
    (key) => body[key] !== null && typeof body[key] === 'object',
  );
  if (nonTextKey) {
    throw new Error(
      `Workflow type ${workflowTypeId} has a non-text value in ${nonTextKey}`,
    );
  }

  await sendRockV2('POST', `workflows/actions/launch/${typeGuid}`, {
    name: workflowName,
    attributeValues: toWorkflowAttributeValues(body),
  });
};
