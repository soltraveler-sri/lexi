// v1 streaming seam — the shared utility that #25 (in-line transform shelf)
// and #24 (doc-level transforms) reuse to forward provider stream chunks to
// the browser as a plain `text/plain; charset=utf-8` chunked response. We
// also tee a final newline-delimited JSON envelope so the client can read
// the provider id without a separate round trip.

const ENCODER = new TextEncoder();
const META_DELIMITER = "\n\n@@LEXI_META@@\n";

export interface StreamingMeta {
  provider?: string;
  ownership?: "user" | "app";
  transformId?: string;
  variantId?: string | null;
  finishReason?: string;
}

export function encodeMeta(meta: StreamingMeta): Uint8Array {
  return ENCODER.encode(META_DELIMITER + JSON.stringify(meta) + "\n");
}

export function streamingResponse(
  iterable: AsyncIterable<string>,
  meta: StreamingMeta = {},
): Response {
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of iterable) {
          if (chunk) {
            controller.enqueue(ENCODER.encode(chunk));
          }
        }
        controller.enqueue(encodeMeta(meta));
      } catch (error) {
        const message = error instanceof Error ? error.message : "stream_error";
        controller.enqueue(
          encodeMeta({ ...meta, finishReason: `error:${message}` }),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export interface ParsedStreamChunk {
  text: string;
  meta: StreamingMeta | null;
}

export function splitMetaFromBuffer(buffer: string): ParsedStreamChunk {
  const idx = buffer.indexOf(META_DELIMITER);

  if (idx === -1) {
    return { text: buffer, meta: null };
  }

  const text = buffer.slice(0, idx);
  const metaPayload = buffer.slice(idx + META_DELIMITER.length).trim();

  try {
    const meta = metaPayload ? (JSON.parse(metaPayload) as StreamingMeta) : null;
    return { text, meta };
  } catch {
    return { text, meta: null };
  }
}

export interface ConsumeStreamHooks {
  onChunk?: (cumulativeText: string, deltaText: string) => void;
  onMeta?: (meta: StreamingMeta) => void;
  signal?: AbortSignal;
}

export async function consumeTextStream(
  response: Response,
  hooks: ConsumeStreamHooks = {},
): Promise<{ text: string; meta: StreamingMeta | null }> {
  if (!response.body) {
    return { text: "", meta: null };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let visibleText = "";
  let meta: StreamingMeta | null = null;

  try {
    while (true) {
      if (hooks.signal?.aborted) {
        await reader.cancel();
        break;
      }

      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const split = splitMetaFromBuffer(buffer);

      if (split.meta) {
        meta = split.meta;
        const delta = split.text.slice(visibleText.length);
        visibleText = split.text;
        if (delta && hooks.onChunk) {
          hooks.onChunk(visibleText, delta);
        }
        hooks.onMeta?.(split.meta);
        // We've already received the meta sentinel; finish reading just to
        // drain the stream cleanly.
        continue;
      }

      const delta = split.text.slice(visibleText.length);
      if (delta) {
        visibleText = split.text;
        hooks.onChunk?.(visibleText, delta);
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { text: visibleText, meta };
}
