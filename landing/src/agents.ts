// ─────────────────────────────────────────────────────────────────────
// Agent catalogue — Orange Maroc demo.
//
// Each agent maps to an Agent Foundry (Nexiva / Gemini Live) share link:
//   https://demo-agentfoundry.bngrenew.com/converse/share/<shareKey>
// The UI dials the agent natively over the share WebSocket — see
// geminiShare.ts. To add an agent: create it in the Agent Foundry, copy
// its share key, and add one entry below.
// ─────────────────────────────────────────────────────────────────────

import type { CallStatus, ShareCallConfig } from "./geminiShare";

export type { CallStatus };
export type { TranscriptEntry } from "./geminiShare";

export type AgentFlavor = "companion" | "assistant";

export interface Agent {
  id: string;
  name: string;
  /** Long-form paragraph used when no `bullets` are supplied. */
  description: string;
  /** Optional bullet list shown instead of `description` on the call screen. */
  bullets?: string[];
  flavor: AgentFlavor;
  /** Share key from the Agent Foundry (last segment of the /share/<key> URL). */
  shareKey: string;
}

// Agent Foundry base — everything mounts under /converse.
export const FOUNDRY_BASE = "https://demo-agentfoundry.bngrenew.com/converse";

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
    // Agent Foundry: "Orange - Morocco - PA" (Salma, voice Sulafat)
    shareKey: "kySxCrCNnV",
  },
  {
    id: "ai-companion",
    name: "AI Companion",
    description:
      "Ask EVA anything. A smart, general-purpose voice companion for Orange Maroc — answers open questions, shares live news and events, explains and informs, and is trained to skip restricted topics.",
    flavor: "companion",
    // Agent Foundry: "Orange - Morocco - AMA" (Yasmine, voice Puck)
    shareKey: "uZXyzQEsAC",
  },
];

/** Resolve the Agent Foundry share config for an agent. */
export const getCallConfig = (agent: Agent): ShareCallConfig => ({
  base: FOUNDRY_BASE,
  shareKey: agent.shareKey,
});
