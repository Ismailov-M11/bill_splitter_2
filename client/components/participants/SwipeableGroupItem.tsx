import { PanInfo, motion, useAnimation } from "framer-motion";
import { Group } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

interface SwipeableGroupItemProps {
    group: Group;
    onSelect: () => void;
    onDelete: () => void;
    hasAssignments: boolean;
}

export function SwipeableGroupItem({
    group,
    onSelect,
    onDelete,
    hasAssignments,
}: SwipeableGroupItemProps) {
    const controls = useAnimation();

    // Reset position if needed when group changes
    useEffect(() => {
        controls.start({ x: 0 });
    }, [group, controls]);

    const handleDragEnd = async (
        _: any,
        info: PanInfo
    ) => {
        const offset = info.offset.x;
        if (offset < -50) {
            await controls.start({ x: -80 });
        } else {
            await controls.start({ x: 0 });
        }
    };

    return (
        <div className="relative overflow-hidden rounded-[10px]">
            {/* Background Actions */}
            <div className="absolute inset-y-0 right-0 w-20 bg-red-500 flex items-center justify-center z-0">
                <button
                    onClick={onDelete}
                    className="w-full h-full text-white text-xs font-bold"
                >
                    Удалить
                </button>
            </div>

            {/* Swipeable Content */}
            <motion.div
                drag="x"
                dragConstraints={{ left: -80, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                animate={controls}
                className={cn(
                    "relative z-10 w-full text-left p-3 border border-slate-100 dark:border-white/5",
                    "bg-slate-50 dark:bg-slate-800 flex items-center justify-between"
                )}
                style={{ touchAction: "pan-y" }} // Important for mobile scrolling
            >
                <div onClick={onSelect} className="flex-1 cursor-pointer">
                    <div className="font-medium text-slate-800 dark:text-slate-100">
                        {group.name}
                    </div>
                    <div className="text-xs text-slate-500">
                        Группа · {group.memberIds.length} участников
                    </div>
                </div>
                <div className="flex items-center gap-3" onClick={onSelect}>
                    {hasAssignments && <div className="text-sm text-green-600">✅</div>}
                    <div className="text-xs text-slate-400">Выбрать</div>
                </div>
            </motion.div>
        </div>
    );
}
