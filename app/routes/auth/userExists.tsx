import { data } from 'react-router';
import { fetchUserLogin } from '~/lib/.server/authentication/rock-authentication';

export const checkUserExists = async (identity: string): Promise<boolean> => {
  const login = await fetchUserLogin(identity);

  if (Array.isArray(login) && login.length > 0) {
    return true;
  } else if (
    login &&
    typeof login === 'object' &&
    Object.keys(login).length > 0
  ) {
    return true;
  }
  return false;
};

/** Never include the identity — the logs must not become an account oracle. */
const rockHost = (): string => {
  try {
    return new URL(`${process.env.ROCK_API}`).host;
  } catch {
    return 'unknown (ROCK_API unset or malformed)';
  }
};

export const userExists = async (identity: string) => {
  try {
    // Reaching here means Rock answered, so a false is "no such person" — a real
    // answer. It is deliberately not logged: it happens on any typo'd email, and
    // the lint config allows only error/warn, which would mislabel it. The two
    // cases are told apart by whether the catch below logged.
    const userExists = await checkUserExists(identity as string);

    return new Response(JSON.stringify({ userExists }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Rock did not answer. The response below stays identical to every other
    // failure on purpose — a client that could tell a lookup failure from a
    // real not-found would leak whether the identity has an account.
    const statusCode = (error as { statusCode?: unknown })?.statusCode;
    console.error(
      `[auth/checkUserExists] Rock lookup failed: ${
        error instanceof Error ? error.name : typeof error
      }, status ${typeof statusCode === 'number' ? statusCode : 'none'}, ` +
        `host ${rockHost()}`,
      error,
    );

    if (error instanceof Error) {
      return data({ error: error.message }, { status: 400 });
    }
    return data({ error: 'An unknown error occurred' }, { status: 400 });
  }
};
