// Placeholder repo until the `agents` table lands in #21. Returns empty
// lists so the Journal Style Guide can render today; real implementation
// will replace this in feature 6.

export interface AgentRow {
  id: string;
  userId: string;
  name: string;
  role: string;
  description: string | null;
  personaPrompt: string;
  usesVoiceProfile: boolean;
  voiceProfileScope: string | null;
  outputKind: "rewrite" | "response";
  defaultModel: string | null;
  defaultTemperature: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function listForUser(_userId: string): Promise<AgentRow[]> {
  return [];
}

export async function getById(_userId: string, _id: string): Promise<AgentRow | null> {
  return null;
}

export async function create(_values: Partial<AgentRow>): Promise<AgentRow | null> {
  return null;
}

export async function update(
  _userId: string,
  _id: string,
  _values: Partial<AgentRow>,
): Promise<AgentRow | null> {
  return null;
}

export async function remove(_userId: string, _id: string): Promise<AgentRow | null> {
  return null;
}
