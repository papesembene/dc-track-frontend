type CacheEnvelope<T> = {
  data: T;
  expiresAt: number;
  staleUntil: number;
};

type CacheOptions = {
  ttlMs?: number;
  staleTtlMs?: number;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_STALE_TTL_MS = 30 * 60 * 1000;

const memoryCache = new Map<string, CacheEnvelope<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function getStorageKey(key: string) {
  return `odc-track:master-data:${key}`;
}

function readSessionCache<T>(key: string): CacheEnvelope<T> | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawValue = window.sessionStorage.getItem(getStorageKey(key));
    if (!rawValue) {
      return null;
    }

    return JSON.parse(rawValue) as CacheEnvelope<T>;
  } catch {
    return null;
  }
}

function writeSessionCache<T>(key: string, value: CacheEnvelope<T>) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(getStorageKey(key), JSON.stringify(value));
  } catch {
    // Ignore quota/storage errors and keep in-memory cache only.
  }
}

function getCachedEnvelope<T>(key: string): CacheEnvelope<T> | null {
  const memoryValue = memoryCache.get(key) as CacheEnvelope<T> | undefined;
  if (memoryValue) {
    return memoryValue;
  }

  const sessionValue = readSessionCache<T>(key);
  if (sessionValue) {
    memoryCache.set(key, sessionValue as CacheEnvelope<unknown>);
    return sessionValue;
  }

  return null;
}

function setCachedEnvelope<T>(
  key: string,
  data: T,
  ttlMs: number,
  staleTtlMs: number,
) {
  const now = Date.now();
  const envelope: CacheEnvelope<T> = {
    data,
    expiresAt: now + ttlMs,
    staleUntil: now + staleTtlMs,
  };

  memoryCache.set(key, envelope as CacheEnvelope<unknown>);
  writeSessionCache(key, envelope);
}

function shouldReuseStaleCache(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response?.status;
  const message = (error as { message?: string })?.message ?? "";

  return (
    status === 429 ||
    status === 503 ||
    message.includes("limite temporairement les requetes") ||
    message.includes("temporairement indisponible") ||
    message.includes("injoignable")
  );
}

export async function getCachedMasterData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const staleTtlMs = options.staleTtlMs ?? DEFAULT_STALE_TTL_MS;
  const now = Date.now();
  const cached = getCachedEnvelope<T>(key);

  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const pendingRequest = inflight.get(key);
  if (pendingRequest) {
    return pendingRequest as Promise<T>;
  }

  const request = fetcher()
    .then((data) => {
      setCachedEnvelope(key, data, ttlMs, staleTtlMs);
      return data;
    })
    .catch((error) => {
      if (cached && cached.staleUntil > Date.now() && shouldReuseStaleCache(error)) {
        return cached.data;
      }

      throw error;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request as Promise<unknown>);

  return request;
}
