const LOCAL_API_URL = "http://localhost:5000";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const isLocalHostname = (hostname: string) => {
  const host = String(hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
};

export const getApiBaseUrl = (): string => {
  const envUrl = trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL || "");
  if (envUrl) return envUrl;

  const vercelUrl = trimTrailingSlash(
    process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL || ""
  );
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  if (typeof window !== "undefined") {
    if (isLocalHostname(window.location.hostname)) {
      return LOCAL_API_URL;
    }
    // On Vercel/prod, fallback to same-origin so rewrites/proxies can work.
    return trimTrailingSlash(window.location.origin);
  }

  return LOCAL_API_URL;
};
