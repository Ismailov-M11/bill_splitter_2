export interface ParticipantInfo {
  id: string;
  name: string;
}

export interface GroupInfo {
  id: string;
  name: string;
  memberIds: string[];
}

export interface DishAssignment {
  id: string;
  name: string;
  qty: number;
  totalPrice: number;
  assignments: Array<{ type: "participant" | "group"; id: string }[]>; // assignments[i] = list of participant/group ids for unit i
}

export interface CalculationResult {
  [participantId: string]: number;
}

/**
 * Calculate how much each participant owes, accounting for:
 * - Individual participant assignments
 * - Group assignments (divided among group members)
 * - Unassigned dishes (divided equally among all participants)
 */
export function calculateSplit(
  dishes: DishAssignment[],
  participants: ParticipantInfo[],
  groups: GroupInfo[],
  servicePercent: number = 0,
): CalculationResult {
  const result: CalculationResult = {};

  // Initialize all participants to 0
  participants.forEach((p) => {
    result[p.id] = 0;
  });

  // Process each dish
  dishes.forEach((dish) => {
    const unitPrice = dish.totalPrice / dish.qty;

    // For each unit of the dish
    dish.assignments.forEach((unitAssignees) => {
      if (unitAssignees.length === 0) {
        // Unassigned unit - divide equally among all participants
        const sharePerParticipant = unitPrice / participants.length;
        participants.forEach((p) => {
          result[p.id] += sharePerParticipant;
        });
      } else {
        // Assigned unit - calculate share for all assignees
        const assigneeParticipants: string[] = [];

        // Expand groups to individual participants
        unitAssignees.forEach((assignee) => {
          if (assignee.type === "participant") {
            assigneeParticipants.push(assignee.id);
          } else if (assignee.type === "group") {
            const group = groups.find((g) => g.id === assignee.id);
            if (group) {
              assigneeParticipants.push(...group.memberIds);
            }
          }
        });

        // Divide equally among all assignees
        const sharePerAssignee = unitPrice / assigneeParticipants.length;
        assigneeParticipants.forEach((participantId) => {
          result[participantId] += sharePerAssignee;
        });
      }
    });
  });

  // Apply service fee if any
  if (servicePercent > 0) {
    const multiplier = 1 + servicePercent / 100;
    Object.keys(result).forEach((pId) => {
      result[pId] *= multiplier;
    });
  }

  // Round to 2 decimals
  Object.keys(result).forEach((pId) => {
    result[pId] = Math.round(result[pId] * 100) / 100;
  });

  return result;
}
