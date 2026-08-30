/**
 * Helper seguro para requisições fetch no frontend.
 * Garante que respostas em HTML (ex: 404/500 do servidor ou proxy) não causem "Unexpected token <".
 */
export async function safeFetchJson<T>(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; data: T | null; error: string | null }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options?.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      const text = await res.text().catch(() => '');
      if (!res.ok) {
        return {
          ok: false,
          data: null,
          error: `Servidor retornou status ${res.status} (${res.statusText}): ${
            text.length > 200 ? text.slice(0, 200) + '...' : text || 'Resposta não-JSON'
          }`,
        };
      }
      return {
        ok: false,
        data: null,
        error: `Resposta inesperada do servidor (esperava JSON, recebeu ${contentType || 'HTML/Texto'}).`,
      };
    }

    const json = await res.json();

    if (!res.ok || json.error) {
      const errorMsg =
        typeof json.error === 'string'
          ? json.error
          : json.message || `Erro na requisição (HTTP ${res.status})`;
      return {
        ok: false,
        data: json,
        error: errorMsg,
      };
    }

    return {
      ok: true,
      data: json as T,
      error: null,
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Falha na comunicação de rede com o servidor.';
    return {
      ok: false,
      data: null,
      error: message,
    };
  }
}
