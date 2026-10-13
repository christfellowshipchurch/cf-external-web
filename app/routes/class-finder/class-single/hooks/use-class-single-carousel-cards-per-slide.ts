/**
 * One card per Embla slide at every width; breakpoints size the slides so the server HTML already
 * has the right layout (a JS width check would flash the desktop grid on tablet/mobile first).
 * - below `lg`: ~⅔-width peek, capped at the card's own max width so it never floats mid-slide
 * - `lg`: 3 across, `xl`: 4 across (4 at 1024px squeezes cards to ~208px)
 */
export const CLASS_SINGLE_CAROUSEL_ITEM_CLASS =
  '!basis-[66.666667%] max-w-[360px] md:max-w-[300px] lg:!basis-[calc((100%-2rem)/3)] lg:max-w-none xl:!basis-[calc((100%-6rem)/4)]';

export const CLASS_SINGLE_CAROUSEL_CONTENT_GAP_CLASS =
  'gap-3 lg:gap-4 xl:gap-8';
