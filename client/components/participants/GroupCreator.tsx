import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Participant, Group, createGroupName, uid } from "@/lib/store";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface GroupCreatorProps {
  participants: Participant[];
  onGroupCreated: (memberIds: string[]) => void;
  onCancel: () => void;
}

export function GroupCreator({
  participants,
  onGroupCreated,
  onCancel,
}: GroupCreatorProps) {
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  const toggleMember = (participantId: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId],
    );
  };

  const handleClear = () => {
    setSelectedMemberIds([]);
  };

  const handleCreate = () => {
    if (selectedMemberIds.length < 2) {
      toast({
        title: "Группа должна содержать минимум двух участников.",
      });
      return;
    }

    onGroupCreated(selectedMemberIds);
  };

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
        Выберите участников для группы
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {participants.map((p) => (
          <button
            key={p.id}
            onClick={() => toggleMember(p.id)}
            className={cn(
              "w-full text-left rounded-[10px] p-3 border transition-colors",
              "flex items-center gap-3",
              selectedMemberIds.includes(p.id)
                ? "border-sky-300 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10"
                : "border-slate-100 dark:border-white/5 bg-white dark:bg-white/4",
            )}
          >
            <input
              type="checkbox"
              checked={selectedMemberIds.includes(p.id)}
              onChange={() => {}}
              className="w-4 h-4 rounded"
            />
            <div className="font-medium text-slate-800 dark:text-slate-100">
              {p.name}
            </div>
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          onClick={onCancel}
          variant="ghost"
          className="flex-1"
        >
          Назад
        </Button>
        <Button
          onClick={handleClear}
          variant="ghost"
          className="flex-1"
        >
          Очистить
        </Button>
        <Button
          onClick={handleCreate}
          className="flex-1"
          disabled={selectedMemberIds.length < 2}
        >
          Готово
        </Button>
      </div>
    </div>
  );
}
