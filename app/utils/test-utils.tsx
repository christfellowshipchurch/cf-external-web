import { render as rtlRender } from '@testing-library/react';
import { BrowserRouter } from 'react-router';
import type { RenderOptions } from '@testing-library/react';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
}

export function render(
  ui: React.ReactElement,
  { route: _route = '/' }: ExtendedRenderOptions = {},
) {
  return rtlRender(<BrowserRouter>{ui}</BrowserRouter>);
}

export * from '@testing-library/react';
export { render as rtlRender };
