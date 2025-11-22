import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Result() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const payload = state as any;

  if (!payload) {
    return (
      <div className="w-full flex justify-center">
        <section className={cn("w-[95%] sm:max-w-md rounded-[14px] p-6 bg-white shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-slate-100")}>
          <div className="text-center">
            <div className="text-lg font-semibold">Нет данных для показа</div>
            <div className="mt-4 text-sm text-slate-500">Вернитесь на главную, чтобы провести расчёт.</div>
            <div className="mt-4">
              <Button onClick={() => navigate('/')}>На главную</Button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <section className={cn(
        "w-[95%] sm:max-w-md animate-fade-in",
        "rounded-[14px] shadow-[0_4px_12px_rgba(0,0,0,0.05)]",
        "bg-white/90 dark:bg-white/5 backdrop-blur supports-[backdrop-filter]:backdrop-blur",
        "border border-slate-200/70 dark:border-white/10",
        "p-4 sm:p-5 mt-4",
      )}>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Итог расчёта</h2>
            <p className="text-sm text-slate-500">Сервис: {payload.servicePercent}% · Всего: {payload.total} UZS</p>
          </div>

          <div className="rounded-[12px] p-3 border border-slate-100 dark:border-white/5 bg-white dark:bg-white/4">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-100">Разбивка по участникам</div>
            <div className="mt-2 space-y-2">
              {payload.participants.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>{p.name}</div>
                  <div className="font-semibold">{Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} UZS</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[12px] p-3 border border-slate-100 dark:border-white/5 bg-white dark:bg-white/4">
            <div className="text-sm font-medium text-slate-700 dark:text-slate-100">Блюда</div>
            <div className="mt-2 text-sm text-slate-600 space-y-2">
              {payload.dishes.map((d: any) => (
                <div key={d.id} className="flex items-center justify-between">
                  <div>{d.name} · {d.qty} шт</div>
                  <div className="text-xs text-slate-500">{d.totalPrice} UZS</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-2">
            <Button onClick={() => navigate(-1)} variant="ghost" className="flex-1">Назад</Button>
            <Button onClick={() => navigate('/') } className="flex-1">Новый расчёт</Button>
          </div>
        </div>
      </section>
    </div>
  );
}
