import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, beforeEach, vi } from 'vitest';

import type { LoaderReturnType } from '../loader';
import { ChurchServingAreaPage } from '../church-serving-area-page';

const { mockNavigate, mockUseLoaderData } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseLoaderData: vi.fn(),
}));

const mockWindowOpen = vi.fn();

vi.mock('react-router', async () => {
  const actual =
    await vi.importActual<typeof import('react-router')>('react-router');

  return {
    ...actual,
    useLoaderData: mockUseLoaderData,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('~/hooks/use-copy-page-path', () => ({
  useCopyPagePath: () => ({
    copied: false,
    copyPath: vi.fn(),
  }),
}));

vi.mock(
  '../../components/volunteer-detail/volunteer-detail-nav.component',
  () => ({
    VolunteerDetailNav: () => <nav aria-label='Volunteer detail' />,
  }),
);

vi.mock(
  '../../components/volunteer-detail/volunteer-detail-hero.component',
  () => ({
    VolunteerDetailHero: ({ title }: { title: string }) => <h1>{title}</h1>,
  }),
);

const baseLoaderData: LoaderReturnType = {
  bucketGuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  bucket: {
    name: 'Outreach & Missions',
    description: 'Serve locally and globally.',
    tag: 'Make a Difference',
    image: 'https://example.com/outreach.jpg',
    pathname: '/volunteer/church/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  },
  roles: [
    {
      id: 'missions-role-guid',
      title: 'Missions',
      description: '<p>Serve with missions.</p>',
    },
    {
      id: 'care-role-guid',
      title: 'Care Team',
      description: '<p>Serve with care.</p>',
    },
    {
      id: 'worship-role-guid',
      title: 'Worship',
      description: '<p>Serve with worship.</p>',
    },
  ],
};

function renderPage(loaderData: LoaderReturnType = baseLoaderData) {
  mockUseLoaderData.mockReturnValue(loaderData);

  return render(
    <MemoryRouter>
      <ChurchServingAreaPage />
    </MemoryRouter>,
  );
}

async function selectRoleAndContinue(roleName: string) {
  const user = userEvent.setup();

  await user.click(
    screen.getAllByRole('radio', { name: new RegExp(`^${roleName}\\b`) })[0],
  );
  await user.click(screen.getAllByRole('button', { name: 'Continue' })[0]);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('open', mockWindowOpen);
});

describe('ChurchServingAreaPage', () => {
  it('navigates Missions opportunities to the volunteer community URL', async () => {
    renderPage();

    await selectRoleAndContinue('Missions');

    expect(mockNavigate).toHaveBeenCalledWith('/volunteer#community');
  });

  it('keeps non-Missions opportunities on the Rock church opportunity form flow', async () => {
    renderPage();

    await selectRoleAndContinue('Care Team');

    expect(mockNavigate).toHaveBeenCalledWith(
      '/rock-page?embed=church-opportunity&opportunityId=care-role-guid',
    );
  });

  it('navigates Worship opportunities to the worship team page', async () => {
    renderPage();

    await selectRoleAndContinue('Worship');

    expect(mockNavigate).toHaveBeenCalledWith('/cf-worship-team');
    expect(mockWindowOpen).not.toHaveBeenCalled();
  });
});
