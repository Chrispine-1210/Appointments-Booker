import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  startOfMonth,
  startOfWeek,
  addDays,
  format,
  isSameMonth,
  endOfMonth,
  differenceInCalendarDays,
} from "date-fns";
import { localDate, todayKey } from "@/lib/booking-utils";
export function MiniMonth({
  selected,
  onSelect,
}: {
  selected: string;
  onSelect: (date: string) => void;
}) {
  const [month, setMonth] = useState(startOfMonth(localDate(selected)));
  const start = startOfWeek(month, { weekStartsOn: 1 });
  return (
    <div className="mini-month">
      <div className="mini-month-header">
        <span>{format(month, "MMMM yyyy")}</span>
        <div className="inline">
          <button
            aria-label="Previous month"
            className="icon-button"
            onClick={() => setMonth(addMonths(month, -1))}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            aria-label="Next month"
            className="icon-button"
            onClick={() => setMonth(addMonths(month, 1))}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
      <div className="mini-month-grid">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
        {Array.from(
          {
            length:
              Math.ceil(
                (differenceInCalendarDays(endOfMonth(month), start) + 1) / 7,
              ) * 7,
          },
          (_, i) => addDays(start, i),
        ).map((d) => {
          const key = format(d, "yyyy-MM-dd");
          return (
            <button
              key={key}
              aria-label={format(d, "EEEE d MMMM yyyy")}
              aria-pressed={selected === key}
              className={
                key === todayKey()
                  ? "today"
                  : key === selected
                    ? "selected"
                    : !isSameMonth(d, month)
                      ? "muted"
                      : ""
              }
              onClick={() => onSelect(key)}
            >
              {format(d, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}
