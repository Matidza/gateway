// gateway-service/utilities/internalServiceClient.js
// Thin helper for the gateway's one-off internal calls to other services
// (e.g. provisioning a profile right after signup) — separate from the
// per-request proxying in index.js, since these are calls the gateway
// itself initiates rather than a client request it's forwarding.

const INTERNAL_SERVICE_SECRET = process.env.INTERNAL_SERVICE_SECRET;
const DEFAULT_TIMEOUT_MS = 4000;

export const callInternalService = async (url, body, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-secret": INTERNAL_SERVICE_SECRET,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Internal call to ${url} failed: ${res.status} ${text}`);
    }

    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
};