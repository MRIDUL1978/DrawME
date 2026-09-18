export function normalizeUrl(input: string): string {
  const url = new URL(input);
  url.hash = '';
  const parameters: Array<[string, string]> = [];
  url.searchParams.forEach((value, key) => parameters.push([key, value]));
  const sorted = parameters.sort(([ak, av], [bk, bv]) =>
    ak === bk ? av.localeCompare(bv) : ak.localeCompare(bk),
  );
  url.search = '';
  for (const [key, value] of sorted) url.searchParams.append(key, value);
  return `${url.origin}${url.pathname}${url.search}`;
}

export async function digestUrl(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(normalizeUrl(input));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
