import { render, type RenderOptions } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import type { ReactElement } from 'react';

type CustomRenderOptions = RenderOptions & {
  route?: string;
};

export function renderWithRouter(
  ui: ReactElement,
  { route = '/', ...options }: CustomRenderOptions = {},
) {
  return render(
    <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>,
    options,
  );
}

export {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
} from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
