// Optional deep analysis with Claude (requires an Anthropic API key in the settings).

import Anthropic from '@anthropic-ai/sdk';
import { AI_SYSTEM_PROMPT, buildAiUserPrompt } from '../shared/aiPrompt';
import type { GameAnalysis, GameContext } from '../shared/types';

export const AI_MODEL = 'claude-opus-5-5';

export interface AiCallbacks {
  onDelta: (text: string) => void;
}

function describeError(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError) return 'Clé API Anthropic invalide (vérifie les paramètres).';
  if (err instanceof Anthropic.PermissionDeniedError) return "Cette clé API n'a pas accès au modèle.";
  if (err instanceof Anthropic.RateLimitError) return 'Limite de requêtes atteinte, réessaie dans un instant.';
  if (err instanceof Anthropic.BadRequestError) return `Requête refusée par l'API : ${err.message}`;
  if (err instanceof Anthropic.APIConnectionError) return 'Impossible de joindre l’API Anthropic (connexion Internet ?).';
  if (err instanceof Anthropic.APIError) return `Erreur API ${err.status ?? ''} : ${err.message}`;
  return (err as Error)?.message ?? String(err);
}

/** Streams a coaching plan in French. Resolves with the full text, rejects with a user-friendly message. */
export async function runAiAnalysis(
  apiKey: string,
  analysis: GameAnalysis,
  ctx: GameContext,
  cb: AiCallbacks,
  signal?: AbortSignal,
): Promise<string> {
  const client = new Anthropic({ apiKey });
  try {
    const stream = client.beta.messages.stream(
      {
        model: AI_MODEL,
        max_tokens: 16000,
        // Server-side fallback: if the request is declined by a safety classifier,
        // the API retries it on Anthropic's recommended fallback model.
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        thinking: { type: 'adaptive' },
        output_config: { effort: 'medium' },
        system: AI_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildAiUserPrompt(analysis, ctx) }],
      },
      { signal },
    );
    let text = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        text += event.delta.text;
        cb.onDelta(event.delta.text);
      }
    }
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') {
      throw new Error("Le modèle a refusé de répondre à cette requête.");
    }
    return text;
  } catch (err) {
    if (err instanceof Anthropic.APIUserAbortError) throw new Error('Analyse annulée.');
    throw new Error(describeError(err));
  }
}
