const PREVIEW_DEVICE_KEY = "facefox_preview_device_key";
const PREVIEW_EMAIL_DOMAIN = "preview.facefox.app";
const PREVIEW_PASSWORD_PREFIX = "FacefoxPreview!";

const createDeviceKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getStoredDeviceKey = () => {
  if (typeof window === "undefined") return "server-preview-device";

  const cached = window.localStorage.getItem(PREVIEW_DEVICE_KEY);
  if (cached) return cached;

  const nextValue = createDeviceKey();
  window.localStorage.setItem(PREVIEW_DEVICE_KEY, nextValue);
  return nextValue;
};

const normaliseForAccountId = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 24) || "previewdevice";

export const getPreviewAccountCredentials = () => {
  const accountId = normaliseForAccountId(getStoredDeviceKey());

  return {
    email: `preview-${accountId}@${PREVIEW_EMAIL_DOMAIN}`,
    password: `${PREVIEW_PASSWORD_PREFIX}${accountId}Aa1`,
  };
};
