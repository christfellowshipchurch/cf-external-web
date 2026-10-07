import { RouterContextProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { loader } from '../loader';
import {
  buildChurchOpportunityApplicationUrl,
  buildRockPageEmbedUrl,
  buildVolunteerApplicationUrl,
  getRockPageEmbedMetaTitle,
  ROCK_PAGE_EMBED_KEYS,
} from '../rock-page.data';

function makeLoaderArgs(search = ''): Parameters<typeof loader>[0] {
  return {
    request: new Request(`http://localhost/rock-page${search}`),
    url: new URL(`http://localhost/rock-page${search}`),
    params: {},
    pattern: '/rock-page',
    context: new RouterContextProvider(),
  };
}

function expectResponse(error: unknown, status: number): void {
  expect(error).toBeInstanceOf(Response);
  expect((error as Response).status).toBe(status);
}

describe('getRockPageEmbedMetaTitle', () => {
  it('returns configured titles for registered embeds', () => {
    expect(
      getRockPageEmbedMetaTitle(ROCK_PAGE_EMBED_KEYS.churchOpportunity),
    ).toBe('Church Opportunity Application');
    expect(
      getRockPageEmbedMetaTitle(ROCK_PAGE_EMBED_KEYS.volunteerApplication),
    ).toBe('Help Me Find My Fit');
  });

  it('falls back to the default title for unknown or missing embeds', () => {
    expect(getRockPageEmbedMetaTitle(null)).toBe('Rock Content');
    expect(getRockPageEmbedMetaTitle('unknown-embed')).toBe('Rock Content');
  });
});

describe('buildChurchOpportunityApplicationUrl', () => {
  it('builds the Rock church opportunity application URL', () => {
    expect(buildChurchOpportunityApplicationUrl('abc-123')).toBe(
      'https://rock.christfellowship.church/page/5886?OpportunityId=abc-123&returnUrl=https%3A%2F%2Fchristfellowship.church%2Fvolunteer&ParentResize=1',
    );
  });

  it('encodes opportunity IDs as query parameter values', () => {
    expect(buildChurchOpportunityApplicationUrl('abc 123?x=y')).toBe(
      'https://rock.christfellowship.church/page/5886?OpportunityId=abc+123%3Fx%3Dy&returnUrl=https%3A%2F%2Fchristfellowship.church%2Fvolunteer&ParentResize=1',
    );
  });
});

describe('buildVolunteerApplicationUrl', () => {
  it('builds the Rock volunteer application form embed URL', () => {
    expect(buildVolunteerApplicationUrl()).toBe(
      'https://rock.christfellowship.church/form-embed?WorkflowTypeGuid=119671db-8ad4-4654-ab45-32d7e79e55e0&returnUrl=https%3A%2F%2Fchristfellowship.church%2Fvolunteer&ParentResize=1',
    );
  });
});

describe('buildRockPageEmbedUrl', () => {
  it('builds registered Rock embed URLs from server-side config', () => {
    const result = buildRockPageEmbedUrl(
      ROCK_PAGE_EMBED_KEYS.churchOpportunity,
      new URLSearchParams({ opportunityId: 'abc-123' }),
    );

    expect(result).toBe(
      'https://rock.christfellowship.church/page/5886?OpportunityId=abc-123&returnUrl=https%3A%2F%2Fchristfellowship.church%2Fvolunteer&ParentResize=1',
    );
  });

  it('rejects unsupported embed keys', () => {
    try {
      buildRockPageEmbedUrl(
        'unknown-embed',
        new URLSearchParams({ opportunityId: 'abc-123' }),
      );
      throw new Error('Expected buildRockPageEmbedUrl to throw');
    } catch (error) {
      expectResponse(error, 400);
    }
  });

  it('requires configured query params', () => {
    try {
      buildRockPageEmbedUrl(
        ROCK_PAGE_EMBED_KEYS.churchOpportunity,
        new URLSearchParams(),
      );
      throw new Error('Expected buildRockPageEmbedUrl to throw');
    } catch (error) {
      expectResponse(error, 400);
    }
  });
});

describe('rock-page loader', () => {
  it('returns a validated Rock URL for registered embed links', async () => {
    const result = await loader(
      makeLoaderArgs('?embed=church-opportunity&opportunityId=abc-123'),
    );

    expect(result).toEqual({
      embed: 'church-opportunity',
      url: 'https://rock.christfellowship.church/page/5886?OpportunityId=abc-123&returnUrl=https%3A%2F%2Fchristfellowship.church%2Fvolunteer&ParentResize=1',
    });
  });

  it('returns a validated Rock URL for the volunteer application embed', async () => {
    const result = await loader(makeLoaderArgs('?embed=volunteer-application'));

    expect(result).toEqual({
      embed: 'volunteer-application',
      url: 'https://rock.christfellowship.church/form-embed?WorkflowTypeGuid=119671db-8ad4-4654-ab45-32d7e79e55e0&returnUrl=https%3A%2F%2Fchristfellowship.church%2Fvolunteer&ParentResize=1',
    });
  });

  it('trims embed query param values before building the Rock URL', async () => {
    const result = await loader(
      makeLoaderArgs('?embed=church-opportunity&opportunityId=%20abc-123%20'),
    );

    expect(result.url).toBe(
      'https://rock.christfellowship.church/page/5886?OpportunityId=abc-123&returnUrl=https%3A%2F%2Fchristfellowship.church%2Fvolunteer&ParentResize=1',
    );
  });

  it('keeps supporting legacy encoded url links', async () => {
    const rockUrl =
      'https://rock.christfellowship.church/page/5886?OpportunityId=abc-123';
    const searchParams = new URLSearchParams({ url: rockUrl });

    const result = await loader(makeLoaderArgs(`?${searchParams.toString()}`));

    expect(result).toEqual({ embed: null, url: rockUrl });
  });

  it('rejects unsupported embed links instead of falling back to url', async () => {
    const rockUrl = 'https://rock.christfellowship.church/page/5886';
    const searchParams = new URLSearchParams({
      embed: 'unknown-embed',
      url: rockUrl,
    });

    try {
      await loader(makeLoaderArgs(`?${searchParams.toString()}`));
      throw new Error('Expected loader to throw');
    } catch (error) {
      expectResponse(error, 400);
    }
  });

  it('rejects blank embed opportunityId values instead of falling back to url', async () => {
    const rockUrl = 'https://rock.christfellowship.church/page/5886';
    const searchParams = new URLSearchParams({
      embed: 'church-opportunity',
      opportunityId: ' ',
      url: rockUrl,
    });

    try {
      await loader(makeLoaderArgs(`?${searchParams.toString()}`));
      throw new Error('Expected loader to throw');
    } catch (error) {
      expectResponse(error, 400);
    }
  });

  it('keeps rejecting wrong-host legacy urls', async () => {
    const searchParams = new URLSearchParams({
      url: 'https://example.com/page/5886',
    });

    try {
      await loader(makeLoaderArgs(`?${searchParams.toString()}`));
      throw new Error('Expected loader to throw');
    } catch (error) {
      expectResponse(error, 403);
    }
  });

  it('keeps rejecting requests without a supported Rock URL parameter', async () => {
    try {
      await loader(makeLoaderArgs());
      throw new Error('Expected loader to throw');
    } catch (error) {
      expectResponse(error, 400);
    }
  });

  it('does not treat bare opportunityId links as supported embeds', async () => {
    try {
      await loader(makeLoaderArgs('?opportunityId=abc-123'));
      throw new Error('Expected loader to throw');
    } catch (error) {
      expectResponse(error, 400);
    }
  });
});
