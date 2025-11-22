import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

declare global {
  interface Window {
    Telegram?: any;
  }
}

type Participant = { id: string; name: string };

type Dish = {
  id: string;
  name: string;
  qty: number;
  totalPrice: number; // total price for all units
  assignments: Array<string | null>; // length == qty
};

type Stage = "dishes" | "participants" | "assign_list" | "assigning" | "review";

export default function Index() {
  // Dish inputs
  const [dishName, setDishName] = useState("");
  const [dishQty, setDishQty] = useState<string>("1");
  const [dishPrice, setDishPrice] = useState<string>("");

  // Participants
  const [participantName, setParticipantName] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);

  // Dishes list
  const [dishes, setDishes] = useState<Dish[]>([]);

  // Flow stage
  const [stage, setStage] = useState<Stage>("dishes");

  // Assigning participant id
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(
    null,
  );

  // Service percent
  const [servicePercent, setServicePercent] = useState<string>("0");

  // Calculation result
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
      } catch {}
    }
  }, []);

  const uid = (prefix = "id") =>
    `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const navigate = useNavigate();

  // Add dish: price is total for qty, we store totalPrice and create assignments array of length qty
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
      assignments: Array.from({ length: qty }).map(() => null),
    };
    // Append so first added stays first
    setDishes((s) => [...s, newDish]);
    setDishName("");
    setDishQty("1");
    setDishPrice("");
  };

  const removeDish = (id: string) =>
    setDishes((s) => s.filter((d) => d.id !== id));

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
        assignments: d.assignments.map((a) => (a === id ? null : a)),
      })),
    );
  };

  // Assignment helpers: increment/decrement assigned units for given participant
  const assignedCountFor = (dish: Dish, participantId: string) =>
    dish.assignments.filter((a) => a === participantId).length;
  const unassignedCount = (dish: Dish) =>
    dish.assignments.filter((a) => a === null).length;

  const changeAssignment = (
    dishId: string,
    participantId: string,
    delta: number,
  ) => {
    setDishes((ds) =>
      ds.map((d) => {
        if (d.id !== dishId) return d;
        const assignments = [...d.assignments];
        if (delta > 0) {
          // assign null slots to participant
          for (let i = 0; i < assignments.length && delta > 0; i++) {
            if (assignments[i] === null) {
              assignments[i] = participantId;
              delta--;
            }
          }
        } else if (delta < 0) {
          // remove participant assignments from end to start
          for (let i = assignments.length - 1; i >= 0 && delta < 0; i--) {
            if (assignments[i] === participantId) {
              assignments[i] = null;
              delta++;
            }
          }
        }
        return { ...d, assignments };
      }),
    );
  };

  const allUnitsAssigned = useMemo(
    () => dishes.every((d) => d.assignments.every((a) => a !== null)),
    [dishes],
  );

  const participantHasAssignments = (participantId: string) =>
    dishes.some((d) => d.assignments.includes(participantId));

  // Always allow continuation from assign_list - assignments are completely optional
  // If no assignments made, all dishes will be divided equally among participants

  // Navigation actions
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

  const openAssignFor = (participantId: string) => {
    setActiveParticipantId(participantId);
    setStage("assigning");
  };

  const backToParticipants = () => {
    setActiveParticipantId(null);
    setStage("assign_list");
  };

  // Calculate and send: compute each participant's sum using unitPrice = totalPrice/qty
  const calculateAndSend = async () => {
    if (dishes.length === 0) {
      toast({ title: "Добавьте блюда перед расчётом." });
      return;
    }

    // If no participants selected: shared mode - cannot calculate for anyone
    if (participants.length === 0) {
      toast({ title: "Добавьте уча��тников перед расчётом." });
      return;
    }

    const map: Record<string, number> = {};
    participants.forEach((p) => (map[p.id] = 0));

    // Sum assigned units and collect unassigned
    let unassignedTotal = 0;
    let grandTotal = 0;
    dishes.forEach((d) => {
      const unitPrice = d.totalPrice / d.qty;
      grandTotal += d.totalPrice;
      d.assignments.forEach((a) => {
        if (a && map[a] !== undefined) {
          map[a] += unitPrice;
        } else {
          unassignedTotal += unitPrice;
        }
      });
    });

    // All unassigned (or all dishes if nothing assigned): divide equally among all participants
    if (unassignedTotal > 0) {
      const per = unassignedTotal / participants.length;
      participants.forEach((p) => (map[p.id] += per));
    }

    const svc = Number(servicePercent) || 0;
    const svcMultiplier = 1 + svc / 100;

    const roundedMap: Record<string, number> = {};
    let totalWithService = 0;
    participants.forEach((p) => {
      const withSvc = map[p.id] * svcMultiplier;
      const rounded = Math.round(withSvc * 100) / 100; // 2 decimals
      roundedMap[p.id] = rounded;
      totalWithService += rounded;
    });

    setResult(roundedMap);

    const payload = {
      type: "calculation",
      servicePercent: svc,
      participants: participants.map((p) => ({
        id: p.id,
        name: p.name,
        amount: roundedMap[p.id] || 0,
      })),
      dishes: dishes.map((d) => ({
        id: d.id,
        name: d.name,
        qty: d.qty,
        totalPrice: d.totalPrice,
        assignments: d.assignments,
      })),
      total: Math.round(totalWithService * 100) / 100,
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
      // navigate to result page with payload
      navigate("/result", { state: payload });
    } catch (e) {
      console.error(e);
      toast({ title: "Ошибка при отправке в бота." });
    } finally {
      setSending(false);
    }
  };

  // UI helpers
  const unitPrice = (d: Dish) => d.totalPrice / d.qty;

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
                  className="w-full rounded-[14px] bg-white dark:bg-white/10 px-4 py-3 text-base text-[#333] placeholder:text-slate-400 border border-slate-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-sky-300"
                />
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <input
                    value={dishQty}
                    onChange={(e) =>
                      setDishQty(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    placeholder="2"
                    className="rounded-[14px] bg-white dark:bg-white/10 px-4 py-3 text-base text-[#333] placeholder:text-slate-400 border border-slate-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                  <input
                    value={dishPrice}
                    onChange={(e) =>
                      setDishPrice(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    placeholder="Введите сумму"
                    className="rounded-[14px] bg-white dark:bg-white/10 px-4 py-3 text-base text-[#333] placeholder:text-slate-400 border border-slate-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-sky-300"
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
                    <div className="text-sm text-slate-600">Общая сумма</div>
                    <div className="font-semibold">
                      {totalSum.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      UZS
                    </div>
                  </div>
                </div>
              </div>

              {/* Button to Participants always at bottom */}
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

          {/* Stage: Participants list */}
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
                    className="flex-1 min-w-0 rounded-[14px] bg-white dark:bg-white/10 px-4 py-3 text-base text-[#333] placeholder:text-slate-400 border border-slate-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-sky-300"
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

          {/* Stage: Participants list to choose which to assign */}
          {stage === "assign_list" && (
            <div className="space-y-3">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Выберите участника для назначения блюд
              </div>
              <div className="space-y-2">
                {participants.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => openAssignFor(p.id)}
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
              </div>
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

          {/* Stage: Assigning for single participant */}
          {stage === "assigning" && activeParticipantId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  Выдача блюд —{" "}
                  {participants.find((x) => x.id === activeParticipantId)?.name}
                </div>
                <div className="text-xs text-slate-400">(остаток/всего)</div>
              </div>

              <div className="space-y-2">
                {dishes.map((d) => {
                  const assignedToThis = assignedCountFor(
                    d,
                    activeParticipantId,
                  );
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
                            changeAssignment(d.id, activeParticipantId, -1)
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
                            changeAssignment(d.id, activeParticipantId, 1)
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
                  onClick={() => setStage("assign_list")}
                  variant="default"
                  className="w-1/2"
                >
                  Готово
                </Button>
              </div>
            </div>
          )}

          {/* Stage: review — show service input and calculate */}
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
                  className="w-28 rounded-[14px] bg-white dark:bg-white/10 px-4 py-3 text-base text-[#333] placeholder:text-slate-400 border border-slate-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-2 focus:ring-sky-300"
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
                        <div>{p.name}</div>
                        <div className="font-semibold">
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
