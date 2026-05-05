"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

const DAY_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_LABELS = ["1?", "2?", "3?", "4?", "5?", "6?", "7?", "8?", "9?", "10?", "11?", "12?"];

type ScheduleType = "personal" | "shared";
type ScheduleRow = {
  id: string;
  group_id: string;
  title: string;
  date: string;
  time: string;
  type: ScheduleType;
};
type CalendarCell = { date: Date; inCurrentMonth: boolean };
type ToastState = { text: string; tone: "error" | "success" } | null;

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildCalendarCells(monthDate: Date): CalendarCell[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  const startDate = new Date(year, month, 1 - firstWeekday);

  return Array.from({ length: 42 }, (_, idx) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + idx);
    return { date, inCurrentMonth: date.getMonth() === month };
  });
}

function ScheduleCard({ item, onClick }: { item: ScheduleRow; onClick: (item: ScheduleRow) => void }) {
  const isShared = item.type === "shared";
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick(item);
      }}
      className="mt-1 w-full rounded-xl border px-2 py-1.5 text-left"
      style={{
        backgroundColor: isShared ? "var(--shared-bg)" : "var(--personal-bg)",
        borderColor: isShared ? "var(--shared-border)" : "var(--personal-border)",
      }}
    >
      <div className="flex items-center gap-1.5">
        {isShared ? (
          <span className="text-[10px] text-indigo-500" aria-hidden>
            ?
          </span>
        ) : null}
        <p className="truncate text-[11px] leading-tight text-[#1e1e1e]">{item.title}</p>
      </div>
      <p className="mt-0.5 text-[10px] tracking-[0.08em] text-neutral-500">{item.time}</p>
    </button>
  );
}

export default function SchedulerApp({ groupId }: { groupId: string }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [popoverDate, setPopoverDate] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editing, setEditing] = useState<ScheduleRow | null>(null);
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [type, setType] = useState<ScheduleType>("personal");
  const [isSaving, setIsSaving] = useState(false);
  const [lunaMessage, setLunaMessage] = useState("??? ?? ??? ??? ????.");
  const [toast, setToast] = useState<ToastState>(null);
  const [copyFeedback, setCopyFeedback] = useState<"idle" | "copied">("idle");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cells = useMemo(() => buildCalendarCells(currentMonth), [currentMonth]);

  const schedulesByDate = useMemo(() => {
    const map = schedules.reduce<Record<string, ScheduleRow[]>>((acc, row) => {
      if (!acc[row.date]) acc[row.date] = [];
      acc[row.date].push(row);
      return acc;
    }, {});
    Object.keys(map).forEach((key) => map[key].sort((a, b) => a.time.localeCompare(b.time)));
    return map;
  }, [schedules]);

  const popoverItems = popoverDate ? schedulesByDate[toDateKey(popoverDate)] ?? [] : [];

  const showToast = (text: string, tone: "error" | "success") => {
    setToast({ text, tone });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 2200);
  };

  const hasDuplicateTime = (date: string, nextTime: string, excludeId?: string) => {
    return schedules.some((item) => item.date === date && item.time === nextTime && item.id !== excludeId);
  };

  const resetForm = () => {
    setTitle("");
    setTime("");
    setType("personal");
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("schedules")
        .select("id,group_id,title,date,time,type")
        .eq("group_id", groupId)
        .order("date", { ascending: true })
        .order("time", { ascending: true });

      if (error) {
        showToast("??? ???? ????.", "error");
      } else {
        const loaded = (data ?? []) as ScheduleRow[];
        setSchedules(loaded);
        if (loaded.length === 0) {
          setLunaMessage("?? ????? ?? ?????! ??? ????? ???!");
        }
      }
      setLoading(false);
    };

    load();

    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, [groupId]);

  useEffect(() => {
    const now = new Date();
    const todayKey = toDateKey(now);
    const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const overdue = (schedulesByDate[todayKey] ?? []).some((item) => item.time < nowTime);
    if (overdue) {
      setLunaMessage("?? ??? ? ?? ??? ? ????");
      return;
    }

    const sharedCount = schedules.filter((item) => item.type === "shared").length;
    if (sharedCount >= 4) {
      const randomLines = [
        "?? ???? ???? ??? ?? ?? ?????!",
        "?? ??? ??. ??? ?? ????.",
        "?? ?? ? ??? ?? ?? ??? ????.",
      ];
      setLunaMessage(randomLines[Math.floor(Math.random() * randomLines.length)]);
    }
  }, [schedules, schedulesByDate]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      setLunaMessage("?? ???? ?? ? ???!");
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyFeedback("copied");
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopyFeedback("idle"), 1500);
      showToast("?? ??? ?????.", "success");
    } catch {
      showToast("?? ??? ?????.", "error");
    }
  };

  const handleDayClick = (date: Date) => {
    setEditing(null);
    setSelectedDate(date);
    setPopoverDate(null);
    resetForm();

    const items = schedulesByDate[toDateKey(date)] ?? [];
    if (items.length === 0) {
      setLunaMessage("??? ? ?? ??? ?????!");
    } else if (items.some((item) => item.type === "shared")) {
      setLunaMessage("?? ?? ??? ??? ?? ?? ? ???? ??? ???! (?)");
    }
  };

  const handleCreateSchedule = async () => {
    if (!selectedDate || !title.trim() || !time) {
      showToast("??? ??? ??? ???.", "error");
      return;
    }
    const date = toDateKey(selectedDate);
    if (hasDuplicateTime(date, time)) {
      showToast("?? ???? ??? ??? ??? ? ???.", "error");
      return;
    }

    setIsSaving(true);
    const payload = { group_id: groupId, title: title.trim(), date, time, type };
    const { data, error } = await supabase
      .from("schedules")
      .insert(payload)
      .select("id,group_id,title,date,time,type")
      .single();
    setIsSaving(false);

    if (error) {
      showToast("??? ?????. ???? ??? ??? ???.", "error");
      return;
    }
    if (data) {
      setSchedules((prev) => [...prev, data as ScheduleRow]);
      setSelectedDate(null);
      showToast("??? ?????.", "success");
    }
  };

  const openEditModal = (item: ScheduleRow) => {
    setSelectedDate(null);
    setPopoverDate(null);
    setEditing(item);
    setTitle(item.title);
    setTime(item.time);
    setType(item.type);
  };

  const handleUpdateSchedule = async () => {
    if (!editing || !title.trim() || !time) {
      showToast("??? ??? ??? ???.", "error");
      return;
    }
    if (hasDuplicateTime(editing.date, time, editing.id)) {
      showToast("?? ???? ??? ??? ??? ? ???.", "error");
      return;
    }

    setIsSaving(true);
    const { data, error } = await supabase
      .from("schedules")
      .update({ title: title.trim(), time, type })
      .eq("id", editing.id)
      .eq("group_id", groupId)
      .select("id,group_id,title,date,time,type")
      .single();
    setIsSaving(false);

    if (error || !data) {
      showToast("??? ?????.", "error");
      return;
    }
    setSchedules((prev) => prev.map((item) => (item.id === editing.id ? (data as ScheduleRow) : item)));
    setEditing(null);
    showToast("??? ?????.", "success");
  };

  const handleDeleteSchedule = async () => {
    if (!editing) return;
    setIsSaving(true);
    const { error } = await supabase.from("schedules").delete().eq("id", editing.id).eq("group_id", groupId);
    setIsSaving(false);

    if (error) {
      showToast("??? ?????.", "error");
      return;
    }
    setSchedules((prev) => prev.filter((item) => item.id !== editing.id));
    setEditing(null);
    showToast("??? ?????.", "success");
  };

  return (
    <main className="min-h-screen bg-white px-3 py-6 text-[#1e1e1e] sm:px-6 sm:py-10 md:px-10">
      <section className="mx-auto w-full max-w-6xl">
        <header className="mb-6 border-b border-[#e9e9e9] pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="inline-block text-xl tracking-[0.2em] md:text-2xl" style={{ fontFamily: "\"Zen Serif\", Georgia, \"Times New Roman\", serif" }}>
              <span className="cursor-default border-b border-transparent transition-colors duration-300 hover:border-[#1e1e1e]">
                iyyko | us
              </span>
            </p>
            <button
              type="button"
              onClick={handleCopyLink}
              className="min-w-[148px] rounded-xl border border-[#1e1e1e] bg-white px-3 py-2 text-xs tracking-[0.04em] transition-all sm:text-sm"
            >
              {copyFeedback === "copied" ? "? ?? ??!" : "?? ?? ????"}
            </button>
          </div>
        </header>

        <div className="rounded-2xl border border-[#e9e9e9] bg-white p-3 sm:p-5 md:p-7">
          <div className="mb-4 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
              className="rounded-full border border-[#e9e9e9] px-3 py-1 text-sm text-neutral-600"
            >
              {"<"}
            </button>
            <p className="text-lg tracking-[0.08em]" style={{ fontFamily: "\"Zen Serif\", Georgia, \"Times New Roman\", serif" }}>
              {currentMonth.getFullYear()}? {MONTH_LABELS[currentMonth.getMonth()]}
            </p>
            <button
              type="button"
              onClick={() => setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
              className="rounded-full border border-[#e9e9e9] px-3 py-1 text-sm text-neutral-600"
            >
              {">"}
            </button>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-7 gap-2 border-b border-[#e9e9e9] pb-3 text-center text-xs tracking-[0.18em] text-neutral-500 md:text-sm">
                {DAY_LABELS.map((day) => (
                  <span key={day}>{day}</span>
                ))}
              </div>

              {loading ? (
                <div className="mt-3 grid grid-cols-7 gap-2">
                  {Array.from({ length: 42 }).map((_, idx) => (
                    <div key={idx} className="min-h-[124px] animate-pulse rounded-xl border border-[#f1f1f1] bg-[#fafafa] p-2">
                      <div className="h-3 w-6 rounded bg-[#efefef]" />
                      <div className="mt-2 h-4 w-full rounded bg-[#efefef]" />
                      <div className="mt-1 h-4 w-4/5 rounded bg-[#efefef]" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-3 grid grid-cols-7 gap-2">
                  {cells.map((cell) => {
                    const key = toDateKey(cell.date);
                    const items = schedulesByDate[key] ?? [];
                    const visibleItems = items.slice(0, 2);
                    const moreCount = items.length - visibleItems.length;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleDayClick(cell.date)}
                        className="min-h-[124px] rounded-xl border bg-white p-2 text-left align-top"
                        style={{ borderColor: "var(--calendar-cell-border)" }}
                      >
                        <span className={`text-xs ${cell.inCurrentMonth ? "text-neutral-500" : "text-neutral-300"}`}>{cell.date.getDate()}</span>
                        <div className="mt-1">
                          {visibleItems.map((item) => (
                            <ScheduleCard key={item.id} item={item} onClick={openEditModal} />
                          ))}
                          {moreCount > 0 ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setPopoverDate(cell.date);
                              }}
                              className="mt-1 text-xs text-neutral-500 underline underline-offset-2"
                            >
                              +{moreCount} more
                            </button>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {selectedDate ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/10 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#ececec] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm tracking-[0.08em] text-neutral-600" style={{ fontFamily: "\"Zen Serif\", Georgia, \"Times New Roman\", serif" }}>
                {toDateKey(selectedDate)} ?? ??
              </p>
              <button type="button" onClick={() => setSelectedDate(null)} className="text-sm text-neutral-500">
                ??
              </button>
            </div>
            <div className="space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="?? ??" className="w-full rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm outline-none" />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm outline-none" />
              <select value={type} onChange={(e) => setType(e.target.value as ScheduleType)} className="w-full rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm outline-none">
                <option value="personal">??</option>
                <option value="shared">??</option>
              </select>
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" disabled={isSaving} onClick={handleCreateSchedule} className="rounded-xl border border-[#1e1e1e] bg-white px-4 py-2 text-sm disabled:opacity-50">
                {isSaving ? "?? ?..." : "?? ??"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editing ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/10 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#ececec] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm tracking-[0.08em] text-neutral-600">{editing.date} ?? ??</p>
              <button type="button" onClick={() => setEditing(null)} className="text-sm text-neutral-500">
                ??
              </button>
            </div>
            <div className="space-y-3">
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm outline-none" />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm outline-none" />
              <select value={type} onChange={(e) => setType(e.target.value as ScheduleType)} className="w-full rounded-xl border border-[#e8e8e8] px-3 py-2 text-sm outline-none">
                <option value="personal">??</option>
                <option value="shared">??</option>
              </select>
            </div>
            <div className="mt-5 flex items-center justify-between">
              <button type="button" onClick={handleDeleteSchedule} disabled={isSaving} className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm text-red-500 disabled:opacity-50">
                ??
              </button>
              <button type="button" onClick={handleUpdateSchedule} disabled={isSaving} className="rounded-xl border border-[#1e1e1e] bg-white px-4 py-2 text-sm disabled:opacity-50">
                ?? ??
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {popoverDate ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/10 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#ececec] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm tracking-[0.08em] text-neutral-600">{toDateKey(popoverDate)} ?? ??</p>
              <button type="button" onClick={() => setPopoverDate(null)} className="text-sm text-neutral-500">
                ??
              </button>
            </div>
            <div>
              {popoverItems.map((item) => (
                <ScheduleCard key={item.id} item={item} onClick={openEditModal} />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-6 right-6 z-10 max-w-xs">
        <div className="mb-2 rounded-2xl border border-[#e7e7e7] bg-white px-4 py-3 text-sm leading-relaxed text-neutral-700 shadow-sm">
          {lunaMessage}
        </div>
        <button type="button" className="ml-auto block rounded-full border border-[#e7e7e7] bg-white px-3 py-2 text-xl shadow-sm animate-pulse" aria-label="??">
          ??
        </button>
      </div>

      {toast ? (
        <div
          className={`fixed left-1/2 top-6 z-40 -translate-x-1/2 rounded-xl border bg-white px-4 py-2 text-xs shadow-sm ${
            toast.tone === "error" ? "border-red-100 text-red-500" : "border-emerald-100 text-emerald-600"
          }`}
        >
          {toast.text}
        </div>
      ) : null}
    </main>
  );
}
