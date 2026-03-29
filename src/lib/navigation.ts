/**
 * Tracks the number of in-app navigations so BackButton can reliably
 * decide whether navigate(-1) is safe or should fallback to "/".
 */
let depth = 0;

export const incrementNavDepth = () => { depth++; };
export const resetNavDepth = () => { depth = 0; };
export const getNavDepth = () => depth;
