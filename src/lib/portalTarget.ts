/** Returns the app frame element for portals, keeping overlays inside the phone container on desktop. */
export const getPortalTarget = (): HTMLElement =>
  document.getElementById("app-frame") || document.body;
