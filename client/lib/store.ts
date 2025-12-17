export interface Participant {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  memberIds: string[];
}

export interface Dish {
  id: string;
  name: string;
  qty: number;
  totalPrice: number;

  // ❗ Исправлено:
  // Было: Array<{ type: "participant" | "group"; id: string }[]>
  // Теперь — простой список ID (string[])
  assignments: string[];
}

export interface AppState {
  participants: Participant[];
  groups: Group[];
  dishes: Dish[];
}

export const initialState: AppState = {
  participants: [],
  groups: [],
  dishes: [],
};

// Utility functions
export function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function createGroupName(
  memberIds: string[],
  participants: Participant[],
): string {
  return memberIds
    .map((id) => participants.find((p) => p.id === id)?.name || "Unknown")
    .join(", ");
}

export function getParticipantsByIds(
  ids: string[],
  participants: Participant[],
): Participant[] {
  return ids
    .map((id) => participants.find((p) => p.id === id))
    .filter((p): p is Participant => p !== undefined);
}
