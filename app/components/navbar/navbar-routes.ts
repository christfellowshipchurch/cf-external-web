// config/navbar-routes.ts
type RoutePattern = {
  path: string;
  isDynamic?: boolean;
};

// Define routes that should use dark mode
// Include both static and dynamic routes
export const darkModeRoutes: RoutePattern[] = [
  // This is to account for the homepage being dark mode only on mobile/iPad -> Designed this way in Figma
  // { path: "/", mobileOnly: true },
  { path: '/about' },
  { path: '/locations' },
  { path: '/locations/', isDynamic: true }, // This will match /locations/[slug]
  { path: '/messages' },
  { path: '/messages/', isDynamic: true }, // This will match /messages/[slug]
  { path: '/articles' },
  { path: '/podcasts' },
  { path: '/link-tree', isDynamic: true }, // This will match /link-tree/[slug]
  // Add more routes as needed
];

// Define routes where the navbar should be completely hidden
// Include both static and dynamic routes
export const hideNavbarRoutes: RoutePattern[] = [
  { path: '/give-embed' }, // Bare embed target: the giving form only, no site chrome
  { path: '/group-finder/', isDynamic: true }, // This will match /groups/[slug]
  { path: '/volunteer/outreach/', isDynamic: true }, // Matches /volunteer/outreach/:groupGuid
  { path: '/volunteer/church/', isDynamic: true }, // Matches /volunteer/church/:bucketGuid
];

export function shouldUseDarkMode(pathname: string): boolean {
  return darkModeRoutes.some((route) => {
    // For exact static matches
    if (!route.isDynamic && route.path === pathname) {
      return true;
    }

    // For dynamic routes
    if (route.isDynamic) {
      // Check if the current path starts with the base path
      // For example, /events/ will match /events/123, /events/my-event, etc.
      return pathname.startsWith(route.path);
    }

    return false;
  });
}

export function shouldHideNavbar(pathname: string): boolean {
  return hideNavbarRoutes.some((route) => {
    // For exact static matches
    if (!route.isDynamic && route.path === pathname) {
      return true;
    }

    // For dynamic routes
    if (route.isDynamic) {
      // Check if the current path starts with the base path
      // For example, /presentation/ will match /presentation/123, /presentation/my-presentation, etc.
      return pathname.startsWith(route.path);
    }

    return false;
  });
}

// Define routes where the footer should be completely hidden
// Include both static and dynamic routes
export const hideFooterRoutes: RoutePattern[] = [
  { path: '/give-embed' }, // Bare embed target: the giving form only, no site chrome
];

export function shouldHideFooter(pathname: string): boolean {
  return hideFooterRoutes.some((route) => {
    // For exact static matches
    if (!route.isDynamic && route.path === pathname) {
      return true;
    }

    // For dynamic routes
    if (route.isDynamic) {
      return pathname.startsWith(route.path);
    }

    return false;
  });
}
