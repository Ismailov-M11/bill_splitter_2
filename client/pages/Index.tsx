import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { GroupCreator } from "@/components/participants/GroupCreator";
import { ParticipantGroupSelector } from "@/components/participants/ParticipantGroupSelector";
import { Participant, Group, Dish, uid, createGroupName } from "@/lib/store";
import { calculateSplit } from "@shared/calculations";

declare global {
  interface Window {
    Telegram?: any;
  }
}

type Stage =
  | "dishes"
  | "participants"
  | "assign_list"
  | "creating_group"
  | "assigning"
  | "review";

type ActiveAssignee = { type: "participant" | "group"; id: string };

export default function Index() {
  // Dish inputs
  const [dishName, setDishName] = useState("");
  const [dishQty, setDishQty] = useState<string>("1");
  const [dishPrice, setDishPrice] = useState<string>("");

  // Participants and groups
  const [participantName, setParticipantName] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);

  const [stage, setStage] = useState<Stage>("dishes");
  const [activeAssignee, setActiveAssignee] = useState<ActiveAssignee | null>(
    null,
  );

  const [servicePercent, setServicePercent] = useState<string>("0");
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const [sending, setSending] = useState(false);

  const totalSum = useMemo(
    () => dishes.reduce((s, d) => s + Number(d.totalPrice || 0), 0),
    [dishes],
  );

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp;
    if (tg && typeof tg.ready === "function") {
      try {
        tg.ready();
        if (tg.colorScheme === "dark")
          document.documentElement.classList.add("dark");
      } catch { }
    }
  }, []);

  const navigate = useNavigate();

  // ===== Dish Management =====
  const addDish = () => {
    const name = dishName.trim();
    const qty = Number(dishQty || 0);
    const price = Number(dishPrice || 0);
    if (
      !name ||
      !Number.isFinite(qty) ||
      qty <= 0 ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      toast({ title: "Пожалуйста, заполните все поля блюда корректно." });
      return;
    }
    const newDish: Dish = {
      id: uid("d"),
      name,
      qty,
      totalPrice: price,
      assignments: Array.from({ length: qty }).map(() => []),
    };
    setDishes((s) => [...s, newDish]);
    setDishName("");
    setDishQty("1");
    setDishPrice("");
  };

  const removeDish = (id: string) =>
    setDishes((s) => s.filter((d) => d.id !== id));

  // ===== Participant Management =====
  const addParticipant = () => {
    const name = participantName.trim();
    if (!name) {
      toast({ title: "Введите имя участника." });
      return;
    }
    setParticipants((p) => [...p, { id: uid("p"), name }]);
    setParticipantName("");
  };

  const removeParticipant = (id: string) => {
    setParticipants((p) => p.filter((x) => x.id !== id));
    setDishes((ds) =>
      ds.map((d) => ({
        ...d,
        assignments: d.assignments.map((unitAssignees) =>
          unitAssignees.filter((a) => a.id !== id),
        ),
      })),
    );
    setGroups((gs) =>
      gs
        .map((g) => ({
          ...g,
          memberIds: g.memberIds.filter((memberId) => memberId !== id),
        }))
        .filter((g) => g.memberIds.length >= 2),
    );
  };

  // ===== Group Management =====
  const createGroup = (memberIds: string[]) => {
    if (memberIds.length < 2) {
      toast({ title: "Группа должна содержать минимум двух участников." });
      return;
    }
    const newGroup: Group = {
      id: uid("g"),
      name: createGroupName(memberIds, participants),
      memberIds,
    };
    setGroups((gs) => [...gs, newGroup]);
    setStage("assign_list");
  };

  const deleteGroup = (groupId: string) => {
    setGroups((gs) => gs.filter((g) => g.id !== groupId));
    setDishes((ds) =>
      ds.map((d) => ({
        ...d,
        assignments: d.assignments.map((unitAssignees) =>
          unitAssignees.filter((a) => a.id !== groupId),
        ),
      })),
    );
  };

  // ===== Assignment Helpers =====
  const unitPrice = (d: Dish) => d.totalPrice / d.qty;

  const countAssigned = (dish: Dish, assignee: ActiveAssignee): number => {
    return dish.assignments.filter((unitAssignees) =>
      unitAssignees.some(
        (a) => a.type === assignee.type && a.id === assignee.id,
      ),
    ).length;
  };

  const unassignedCount = (dish: Dish): number =>
    dish.assignments.filter((unitAssignees) => unitAssignees.length === 0)
      .length;

  const changeAssignment = (
    dishId: string,
    assignee: ActiveAssignee,
    delta: number,
  ) => {
    setDishes((ds) =>
      ds.map((d) => {
        if (d.id !== dishId) return d;
        const assignments = [...d.assignments];
        if (delta > 0) {
          for (let i = 0; i < assignments.length && delta > 0; i++) {
            if (assignments[i].length === 0) {
              assignments[i] = [assignee];
              delta--;
            }
          }
        } else if (delta < 0) {
          for (let i = assignments.length - 1; i >= 0 && delta < 0; i--) {
            if (
              assignments[i].some(
                (a) => a.type === assignee.type && a.id === assignee.id,
              )
            ) {
              assignments[i] = assignments[i].filter(
                (a) => !(a.type === assignee.type && a.id === assignee.id),
              );
              delta++;
            }
          }
        }
        return { ...d, assignments };
      }),
    );
  };

  const assigneeHasAssignments = (assignee: ActiveAssignee): boolean =>
    dishes.some((d) =>
      d.assignments.some((unitAssignees) =>
        unitAssignees.some(
          (a) => a.type === assignee.type && a.id === assignee.id,
        ),
      ),
    );

  const participantHasAssignments = (participantId: string): boolean =>
    assigneeHasAssignments({ type: "participant", id: participantId });

  const groupHasAssignments = (groupId: string): boolean =>
    assigneeHasAssignments({ type: "group", id: groupId });

  // ===== Navigation =====
  const goToParticipants = () => {
    if (dishes.length === 0) {
      toast({
        title: "Добавьте хотя бы одно блюдо перед добавлением участников.",
      });
      return;
    }
    setStage("participants");
  };

  const goToAssignList = () => {
    setStage("assign_list");
  };

  const openAssignFor = (assignee: ActiveAssignee) => {
    setActiveAssignee(assignee);
    setStage("assigning");
  };

  const backToAssignList = () => {
    setActiveAssignee(null);
    setStage("assign_list");
  };

  // ===== Calculation =====
  const calculateAndSend = async () => {
    if (dishes.length === 0) {
      toast({ title: "Добавьте блюда перед расчётом." });
      return;
    }

    if (participants.length === 0) {
      toast({ title: "Добавьте участников перед расчётом." });
      return;
    }

    const svc = Number(servicePercent) || 0;

    const calculationDishes = dishes.map((d) => ({
      id: d.id,
      name: d.name,
      qty: d.qty,
      totalPrice: d.totalPrice,
      assignments: d.assignments,
    }));

    const resultMap = calculateSplit(
      calculationDishes,
      participants,
      groups,
      svc,
    );

    setResult(resultMap);

    // ===== 🔥 СПЕЦИАЛЬНО ДЛЯ PYTHON-БОТА: только flatAssignments =====
    const payload = {
      type: "calculation",
      servicePercent: svc,
      participants: participants.map((p) => ({
        id: p.id,
        name: p.name,
        amount: resultMap[p.id] || 0,
      })),
      dishes: dishes.map((d) => {
        const flatAssignments = Array.from({ length: d.qty }).map(
          (_, idx) => {
            const unitAssignees = d.assignments[idx];

            if (!unitAssignees || unitAssignees.length === 0) {
              return null;
            }

            // 1. Проверяем, есть ли назначение на группу
            const g = unitAssignees.find((a) => a.type === "group");
            if (g) return g.id;

            // 2. Иначе проверяем участника
            const p = unitAssignees.find((a) => a.type === "participant");
            if (p) return p.id;

            return null;
          },
        );

        return {
          id: d.id,
          name: d.name,
          qty: d.qty,
          totalPrice: d.totalPrice,
          flatAssignments, // ✔ теперь тут могут быть и ID участников, и ID групп
        };
      }),
      groups: groups.map((g) => ({
        id: g.id,
        name: g.name,
        memberIds: g.memberIds,
      })),
      total: Object.values(resultMap).reduce((a, b) => a + b, 0),
    } as const;

    try {
      setSending(true);
      const tg = window.Telegram?.WebApp;
      if (tg && typeof tg.sendData === "function") {
        tg.sendData(JSON.stringify(payload));
      } else if (window.Telegram?.WebApp?.sendData) {
        window.Telegram.WebApp.sendData(JSON.stringify(payload));
      } else {
        console.log("Telegram WebApp not detected, payload:", payload);
      }
      toast({ title: "✅ Отправлено успешно!" });
      navigate("/result", { state: payload });
    } catch (e) {
      console.error(e);
      toast({ title: "Ошибка при отправке в бота." });
    } finally {
      setSending(false);
    }
  };

  // ===== RENDER =====
  return (
    <div className="w-full flex justify-center">
      <section
        className={cn(
          "w-[95%] sm:max-w-md animate-fade-in",
          "rounded-[14px] shadow-[0_4px_12px_rgba(0,0,0,0.05)]",
          "bg-white/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:backdrop-blur",
          "border border-slate-200/70 dark:border-white/10",
          "p-4 sm:p-5 mt-2 sm:mt-4",
        )}
      >
        <div className="space-y-4">
          {/* Stage: Dishes */}
          {stage === "dishes" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                  🥘 Название блюда
                </label>
                <input
                  value={dishName}
                  onChange={(e) => setDishName(e.target.value)}
                  placeholder="Введите название блюда"
                  className="w-full rounded-[14px] bg-white dark:bg-white/10 px-4 py-3 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <input
                    value={dishQty}
                    onChange={(e) =>
                      setDishQty(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="2"
                    className="rounded-[14px] bg-white dark:bg-white/10 px-4 py-3 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                  <input
                    value={dishPrice}
                    onChange={(e) =>
                      setDishPrice(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    placeholder="Введите сумму"
                    className="rounded-[14px] bg-white dark:bg-white/10 px-4 py-3 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={addDish}
                  >
                    Добавить блюдо
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDishName("");
                      setDishQty("1");
                      setDishPrice("");
                    }}
                  >
                    Очистить
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    🍽️ Список блюд
                  </div>
                  <div className="text-xs text-slate-400">
                    {dishes.length} поз.
                  </div>
                </div>
                <div className="space-y-2">
                  {dishes.length === 0 && (
                    <div className="text-sm text-slate-500">
                      Нет добавленных блюд
                    </div>
                  )}
                  {dishes.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-[12px] p-3 border border-slate-100 dark:border-white/5 bg-white dark:bg-white/4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-100">
                            {d.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {d.qty} шт ·{" "}
                            {unitPrice(d).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            UZS / шт
                          </div>
                        </div>
                        <div>
                          <button
                            className="text-sm text-slate-400"
                            onClick={() => removeDish(d.id)}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 p-3 rounded-[10px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-slate-600 dark:text-slate-300">Общая сумма</div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {totalSum.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      UZS
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Button
                  onClick={goToParticipants}
                  className="w-full h-12"
                  disabled={dishes.length === 0}
                >
                  Добавить участников
                </Button>
              </div>
            </div>
          )}

          {/* Stage: Participants */}
          {stage === "participants" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300">
                  👥 Добавить участника
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    value={participantName}
                    onChange={(e) => setParticipantName(e.target.value)}
                    placeholder="Имя участника"
                    className="flex-1 min-w-0 rounded-[14px] bg-white dark:bg-white/10 px-4 py-3 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                  <Button
                    onClick={addParticipant}
                    className="flex-none"
                    disabled={!participantName.trim()}
                  >
                    Добавить
                  </Button>
                </div>

                <div className="mt-3 space-y-2">
                  {participants.length === 0 && (
                    <div className="text-sm text-slate-500">Нет участников</div>
                  )}
                  {participants.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-[10px] p-2 border border-slate-100 dark:border-white/5 bg-white dark:bg-white/4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="font-medium text-slate-800 dark:text-slate-100">
                          {p.name}
                        </div>
                        {participantHasAssignments(p.id) && (
                          <div className="text-sm text-green-600">✅</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          className="text-sm text-slate-400"
                          onClick={() => removeParticipant(p.id)}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStage("dishes")}
                  variant="ghost"
                  className="flex-1"
                >
                  Назад к блюдам
                </Button>
                <Button onClick={goToAssignList} className="flex-1">
                  Назначить блюда
                </Button>
              </div>
            </div>
          )}

          {/* Stage: Assignment List */}
          {stage === "assign_list" && (
            <div className="space-y-3">
              <ParticipantGroupSelector
                participants={participants}
                groups={groups}
                onSelectParticipant={(pId) =>
                  openAssignFor({ type: "participant", id: pId })
                }
                onSelectGroup={(gId) =>
                  openAssignFor({ type: "group", id: gId })
                }
                participantHasAssignments={participantHasAssignments}
                groupHasAssignments={groupHasAssignments}
                onCreateGroup={() => setStage("creating_group")}
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => setStage("participants")}
                  variant="ghost"
                  className="flex-1"
                >
                  Назад
                </Button>
                <Button onClick={() => setStage("review")} className="flex-1">
                  Продолжить
                </Button>
              </div>
            </div>
          )}

          {/* Stage: Creating Group */}
          {stage === "creating_group" && (
            <GroupCreator
              participants={participants}
              onGroupCreated={createGroup}
              onCancel={() => setStage("assign_list")}
            />
          )}

          {/* Stage: Assigning */}
          {stage === "assigning" && activeAssignee && (
            <div className="space-y-3">
              <div className="flex items-center justify_between">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Выдача блюд —{" "}
                  {activeAssignee.type === "participant"
                    ? participants.find((x) => x.id === activeAssignee.id)?.name
                    : groups.find((x) => x.id === activeAssignee.id)?.name}
                </div>
                <div className="text-xs text-slate-400">(остаток/всего)</div>
              </div>

              <div className="space-y-2">
                {dishes.map((d) => {
                  const assignedToThis = countAssigned(d, activeAssignee);
                  const remaining = unassignedCount(d);
                  return (
                    <div
                      key={d.id}
                      className="rounded-[10px] p-3 border border-slate-100 dark:border-white/5 bg-white dark:bg-white/4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-100">
                            {d.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {d.qty} шт ·{" "}
                            {unitPrice(d).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            UZS / шт
                          </div>
                        </div>
                        <div className="text-sm text-slate-500">
                          {remaining}/{d.qty}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <button
                          className="px-3 py-1 rounded-lg bg-slate-100"
                          onClick={() =>
                            changeAssignment(d.id, activeAssignee, -1)
                          }
                          aria-label="decrease"
                        >
                          −
                        </button>
                        <div className="flex-1 text-center">
                          {assignedToThis} шт{" "}
                          {assignedToThis > 0 && (
                            <span className="text-green-600">✅</span>
                          )}
                        </div>
                        <button
                          className="px-3 py-1 rounded-lg bg-slate-100"
                          onClick={() =>
                            changeAssignment(d.id, activeAssignee, 1)
                          }
                          aria-label="increase"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center mt-3">
                <Button
                  onClick={backToAssignList}
                  variant="default"
                  className="w-1/2"
                >
                  Готово
                </Button>
              </div>
            </div>
          )}

          {/* Stage: review — service percentage */}
          {stage === "review" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  💼 Сервис (%)
                </label>
                <input
                  value={servicePercent}
                  onChange={(e) =>
                    setServicePercent(e.target.value.replace(/[^0-9.]/g, ""))
                  }
                  placeholder="0"
                  className="w-28 rounded-[14px] bg-white dark:bg-white/10 px-4 py-3 text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 border border-slate-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => setStage("assign_list")}
                  variant="ghost"
                  className="flex-1"
                >
                  Назад
                </Button>
                <Button
                  onClick={calculateAndSend}
                  className="flex-1"
                  disabled={sending}
                >
                  Рассчитать
                </Button>
              </div>

              {result && (
                <div className="mt-3 rounded-[12px] p-3 border border-slate-100 dark:border-white/5 bg-white dark:bg-white/4">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-100">
                    Результат
                  </div>
                  <div className="mt-2 space-y-2">
                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between"
                      >
                        <div className="text-slate-800 dark:text-slate-100">{p.name}</div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {(result[p.id] ?? 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          UZS
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
