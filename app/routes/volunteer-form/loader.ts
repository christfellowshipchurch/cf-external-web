import { LoaderFunctionArgs, redirect } from 'react-router';

export async function loader({ url }: LoaderFunctionArgs) {
  // If the path is exactly /volunteer-form (no trailing slash or anything after)
  if (url.pathname === '/volunteer-form') {
    return redirect('/volunteer-form/welcome');
  }

  return Response.json({});
}
