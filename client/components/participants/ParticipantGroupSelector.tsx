import { Participant, Group } from "@/lib/store";
import { cn } from "@/lib/utils";

interface ParticipantGroupSelectorProps {
  participants: Participant[];
  groups: Group[];
  onSelectParticipant: (participantId: string) => void;
  onSelectGroup: (groupId: string) => void;
  participantHasAssignments?: (participantId: string) => boolean;
  groupHasAssignments?: (groupId: string) => boolean;
  onCreateGroup: () => void;
}

export function ParticipantGroupSelector({
  participants,
  groups,
  onSelectParticipant,
  onSelectGroup,
  participantHasAssignments = () => false,
  groupHasAssignments = () => false,
  onCreateGroup,
}: ParticipantGroupSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
        Выберите участника или группу для назначения блюд
      </div>

      <div className="space-y-2">
        {/* Individual Participants */}
        {participants.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectParticipant(p.id)}
            className="w-full text-left rounded-[10px] p-3 border border-slate-100 dark:border-white/5 bg-white dark:bg-white/4 flex items-center justify-between"
          >
            <div className="font-medium text-slate-800 dark:text-slate-100">
              {p.name}
            </div>
            <div className="flex items-center gap-3">
              {participantHasAssignments(p.id) && (
                <div className="text-sm text-green-600">✅</div>
              )}
              <div className="text-xs text-slate-400">Выбрать</div>
            </div>
          </button>
        ))}

        {/* Separator if groups exist */}
        {groups.length > 0 && (
          <div className="relative py-2">
            <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200 dark:bg-white/10" />
          </div>
        )}

        {/* Groups */}
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => onSelectGroup(g.id)}
            className="w-full text-left rounded-[10px] p-3 border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex items-center justify-between"
          >
            <div>
              <div className="font-medium text-slate-800 dark:text-slate-100">
                {g.name}
              </div>
              <div className="text-xs text-slate-500">
                Группа · {g.memberIds.length} участников
              </div>
            </div>
            <div className="flex items-center gap-3">
              {groupHasAssignments(g.id) && (
                <div className="text-sm text-green-600">✅</div>
              )}
              <div className="text-xs text-slate-400">Выбрать</div>
            </div>
          </button>
        ))}
      </div>

      {/* Create Group Button */}
      {participants.length >= 2 && (
        <button
          onClick={onCreateGroup}
          className="w-full rounded-[10px] p-3 border-2 border-dashed border-slate-300 dark:border-white/20 text-slate-600 dark:text-slate-300 hover:border-sky-300 dark:hover:border-sky-500/30 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors"
        >
          ➕ Создать группу
        </button>
      )}
    </div>
  );
}
