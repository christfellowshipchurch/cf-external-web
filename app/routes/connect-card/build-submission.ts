import type { ConnectFormType } from './types';

const ENGLISH_WORKFLOW_NAME = 'CFDP Web Connect Card';

const joinFormFieldValues = (
  formData: Record<string, unknown>,
  keyMatcher: (key: string) => boolean,
): string =>
  Object.keys(formData)
    .filter(keyMatcher)
    .map((key) => String(formData[key]))
    .join(',');

export type ConnectCardSubmissionPreview = {
  workflowTypeId: '403' | '902';
  workflowName: string;
  body: ConnectFormType;
  rawFormData: Record<string, string>;
};

export function buildConnectCardSubmission(
  formData: Record<string, unknown>,
): ConnectCardSubmissionPreview {
  const {
    email,
    firstName,
    lastName,
    phone,
    otherContent,
    campus,
    decision,
    language,
  } = formData;

  const isSpanish = language === 'Spanish';
  const workflowTypeId = isSpanish ? '403' : '902';
  const workflowName = ENGLISH_WORKFLOW_NAME;

  const body: ConnectFormType = {
    FirstName: String(firstName ?? ''),
    LastName: String(lastName ?? ''),
    Campus: String(campus ?? ''),
    PhoneNumber: String(phone ?? ''),
    // Both workflows (403 and 902) read the email from `EmailAddress`.
    EmailAddress: String(email ?? ''),
  };

  if (isSpanish) {
    body.LaunchSource = 'app';

    const nextStep = formData.nextStep;
    const selection = joinFormFieldValues(formData, (key) =>
      key.startsWith('selection-'),
    );

    if (nextStep !== undefined && String(nextStep) !== '') {
      body.NextStep = String(nextStep);
    }
    if (selection) {
      body.Selection = selection;
    }
  } else {
    body.AllThatApplies = joinFormFieldValues(formData, (key) =>
      key.includes('allThatApplies'),
    );
  }

  if (decision) {
    body.Decision = String(decision);
  }
  if (otherContent) {
    body.Other = String(otherContent);
  }

  const rawFormData = Object.fromEntries(
    Object.entries(formData).map(([key, value]) => [key, String(value ?? '')]),
  );

  return {
    workflowTypeId,
    workflowName,
    body,
    rawFormData,
  };
}
