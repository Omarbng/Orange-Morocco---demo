// ─────────────────────────────────────────────────────────────────────
// Agent catalogue — Orange Maroc demo.
//
// IDs and slugs below match the supplied Orange Maroc JSON spec exactly.
// ─────────────────────────────────────────────────────────────────────

import { buildCallConfig, type AgentSpec } from "./callConfig";
import type { CallConfig } from "./verto";

export type AgentFlavor = "companion" | "assistant";

export interface Agent extends AgentSpec {
  id: string;
  name: string;
  /** Long-form paragraph used when no `bullets` are supplied. */
  description: string;
  /** Optional bullet list shown instead of `description` on the call screen. */
  bullets?: string[];
  flavor: AgentFlavor;
}

export const agents: Agent[] = [
  {
    id: "personal-assistant",
    name: "Personal Assistant",
    description:
      "Your Orange Maroc personal assistant — answers calls when you're busy, takes notes, delivers messages, and checks availability for you.",
    bullets: [
      "Answers your calls when you're busy",
      "Takes notes during the conversation",
      "Delivers messages, checks availability and more",
    ],
    flavor: "assistant",
    assistantId: "7382",
    voiceId: "OfGMGmhShO8iL9jCkXy8",
    language: "ar-MR",
    typeSlug: "orange-morocco---personal-assistant",
  },
  {
    id: "ai-companion",
    name: "AI Companion",
    description:
      "Ask EVA anything. A smart, general-purpose voice companion for Orange Maroc — answers open questions, shares live news and events, explains and informs, and is trained to skip restricted topics.",
    flavor: "companion",
    assistantId: "4424",
    voiceId: "OfGMGmhShO8iL9jCkXy8",
    language: "ar-MR",
    typeSlug: "orange-morocco---ai-companion",
  },
];

/** Resolve the full Verto `CallConfig` for an agent. */
export const getCallConfig = (agent: Agent): CallConfig => buildCallConfig(agent);
