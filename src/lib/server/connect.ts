import "server-only";

export class ConnectUnaryError extends Error {
  status: number;
  bodyText: string;
  url: string;

  constructor(params: { message: string; status: number; bodyText: string; url: string }) {
    super(params.message);
    this.name = "ConnectUnaryError";
    this.status = params.status;
    this.bodyText = params.bodyText;
    this.url = params.url;
  }
}

export async function connectUnaryJson<TRes>(params: {
  baseUrl: string;
  serviceTypeName: string;
  methodName: string;
  body: unknown;
  csrfToken?: string;
  timeoutMs?: number;
}): Promise<TRes> {
  const { baseUrl, serviceTypeName, methodName, body, csrfToken, timeoutMs = 10_000 } = params;
  const url = new URL(`/${serviceTypeName}/${methodName}`, baseUrl).toString();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "Connect-Protocol-Version": "1"
    };
    if (csrfToken) headers["x-codeium-csrf-token"] = csrfToken;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
      signal: controller.signal,
      cache: "no-store"
    });

    if (!res.ok) {
      const bodyText = await res.text().catch(() => "");
      throw new ConnectUnaryError({
        message: `Connect unary failed (${res.status})`,
        status: res.status,
        bodyText,
        url
      });
    }
    return (await res.json()) as TRes;
  } finally {
    clearTimeout(timer);
  }
}
