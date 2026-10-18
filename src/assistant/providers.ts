import type { AssistantReply } from './engine'

export interface AssistantInput {
  viewer: string
  question: string
  /** Only what this viewer is allowed to see, already filtered by role. */
  context: Record<string, unknown>
}

export interface AssistantProvider {
  id: 'scripted' | 'workers-ai'
  label: string
  enabled: boolean
  reply: (input: AssistantInput) => Promise<AssistantReply>
}

/**
 * Planned, not connected: a Cloudflare Worker that calls a small, low-cost model on Workers AI.
 *
 * Shape of the call the Worker would make (not executed anywhere in this demo):
 *   POST /api/assistant  { viewer, question, context }
 *   → env.AI.run(<small instruct model>, { messages: [system prompt, filtered context, question] })
 *
 * The Worker would apply the same rules the scripted answers follow: answer only from approved
 * content and the viewer's own permitted status, cite sources, say when it doesn't know, and
 * require a person to approve anything consequential. It stays switched off until connected.
 */
export const workersAI: AssistantProvider = {
  id: 'workers-ai',
  label: 'Cloudflare Workers AI (not connected)',
  enabled: false,
  reply: async () => {
    throw new Error('Workers AI is not connected in this demo.')
  },
}
