import React, { useState, useMemo } from 'react';
import { Material, AttendanceRecord, Announcement } from '@/types/main';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  Bell,
  X,
} from 'lucide-react';

export interface CalendarViewProps {
  materials: Material[];
  attendanceRecords?: AttendanceRecord[];
  announcements?: Announcement[];
  className?: string;
  onSelectMaterial?: (material: Material) => void;
}

interface CalendarDayEvent {
  id: string;
  type: 'deadline' | 'attendance' | 'announcement';
  title: string;
  date: Date;
  details?: string;
  rawItem?: any;
}

export function CalendarView({
  materials,
  attendanceRecords = [],
  announcements = [],
  className = '',
  onSelectMaterial,
}: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Aggregate all events
  const events = useMemo<CalendarDayEvent[]>(() => {
    const list: CalendarDayEvent[] = [];

    // 1. Material Deadlines
    materials.forEach((m) => {
      if (m.dueAt) {
        const d = new Date(m.dueAt);
        list.push({
          id: `mat-${m.id}`,
          type: 'deadline',
          title: m.name,
          date: d,
          details: `Due: ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Category: ${m.category}`,
          rawItem: m,
        });
      }
    });

    // 2. Attendance Records
    const attendanceDates = new Set<string>();
    attendanceRecords.forEach((att) => {
      if (att.date && !attendanceDates.has(att.date)) {
        attendanceDates.add(att.date);
        const [y, m, d] = att.date.split('-').map(Number);
        list.push({
          id: `att-${att.date}`,
          type: 'attendance',
          title: 'Class Session',
          date: new Date(y, m - 1, d),
          details: `Attendance session recorded`,
        });
      }
    });

    // 3. Announcements
    announcements.forEach((a) => {
      if (a.createdAt) {
        const d = new Date(a.createdAt);
        list.push({
          id: `ann-${a.id}`,
          type: 'announcement',
          title: a.title,
          date: d,
          details: a.content.slice(0, 100),
          rawItem: a,
        });
      }
    });

    return list;
  }, [materials, attendanceRecords, announcements]);

  // Map events by date key: YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarDayEvent[]>();
    events.forEach((ev) => {
      const key = `${ev.date.getFullYear()}-${String(ev.date.getMonth() + 1).padStart(2, '0')}-${String(ev.date.getDate()).padStart(2, '0')}`;
      const existing = map.get(key) || [];
      existing.push(ev);
      map.set(key, existing);
    });
    return map;
  }, [events]);

  // Calendar grid math
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Selected day events
  const selectedDayKey = selectedDay
    ? `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.getDate()).padStart(2, '0')}`
    : null;
  const selectedEvents = selectedDayKey ? eventsByDate.get(selectedDayKey) || [] : [];

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Calendar Header Controls */}
      <div className="bg-surface border border-border-color rounded-2xl p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-primary-text font-display">
              {monthNames[month]} {year}
            </h3>
            <span className="text-[10px] text-muted-text font-mono uppercase">
              Academic Schedule & Deadlines
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={goToToday} className="text-xs">
            Today
          </Button>
          <Button variant="ghost" size="sm" onClick={prevMonth} className="p-1.5 rounded-lg">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={nextMonth} className="p-1.5 rounded-lg">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs px-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-error" />
          <span className="text-muted-text text-[11px]">Assignment Due Date</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-success" />
          <span className="text-muted-text text-[11px]">Class Session</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-warning" />
          <span className="text-muted-text text-[11px]">Announcement</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-surface border border-border-color rounded-3xl overflow-hidden shadow-sm">
        {/* Days of Week */}
        <div className="grid grid-cols-7 border-b border-border-color bg-elevated/50 text-center font-mono text-[10px] uppercase font-semibold text-muted-text py-2">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Matrix */}
        <div className="grid grid-cols-7 divide-x divide-y divide-border-color">
          {/* Previous month filler cells */}
          {Array.from({ length: firstDayOfMonth }).map((_, i) => {
            const dayNum = daysInPrevMonth - firstDayOfMonth + i + 1;
            return (
              <div
                key={`prev-${i}`}
                className="min-h-[85px] p-2 bg-elevated/20 text-muted-text/40 text-xs font-mono select-none"
              >
                {dayNum}
              </div>
            );
          })}

          {/* Current month days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const dayNum = i + 1;
            const dateObj = new Date(year, month, dayNum);
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            const dayEvents = eventsByDate.get(dateKey) || [];

            const isToday =
              new Date().getFullYear() === year &&
              new Date().getMonth() === month &&
              new Date().getDate() === dayNum;

            const isSelected = selectedDayKey === dateKey;

            return (
              <div
                key={`cur-${dayNum}`}
                onClick={() => setSelectedDay(dateObj)}
                className={`min-h-[85px] p-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-primary/10 ring-2 ring-primary/40'
                    : isToday
                    ? 'bg-elevated/70'
                    : 'hover:bg-elevated/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-mono font-semibold ${
                      isToday
                        ? 'w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center -ml-1 -mt-1'
                        : 'text-primary-text'
                    }`}
                  >
                    {dayNum}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-mono text-muted-text">
                      {dayEvents.length}
                    </span>
                  )}
                </div>

                {/* Event Pills */}
                <div className="space-y-1 mt-1">
                  {dayEvents.slice(0, 2).map((ev) => (
                    <div
                      key={ev.id}
                      className={`text-[9px] truncate px-1.5 py-0.5 rounded-md font-medium flex items-center gap-1 ${
                        ev.type === 'deadline'
                          ? 'bg-error/15 text-error border border-error/20'
                          : ev.type === 'attendance'
                          ? 'bg-success/15 text-success border border-success/20'
                          : 'bg-warning/15 text-warning border border-warning/20'
                      }`}
                      title={ev.title}
                    >
                      <span
                        className={`w-1 h-1 rounded-full flex-shrink-0 ${
                          ev.type === 'deadline'
                            ? 'bg-error'
                            : ev.type === 'attendance'
                            ? 'bg-success'
                            : 'bg-warning'
                        }`}
                      />
                      <span className="truncate">{ev.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[9px] text-muted-text font-mono block pl-1">
                      +{dayEvents.length - 2} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Event Drawer / Details */}
      {selectedDay && (
        <div className="bg-surface border border-border-color rounded-2xl p-4 shadow-md space-y-3 animate-fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-border-color">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-bold text-primary-text font-display">
                Schedule for {selectedDay.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </h4>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDay(null)}
              className="p-1 rounded-lg text-muted-text hover:text-primary-text"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="text-xs text-muted-text py-2">No scheduled events or deadlines on this day.</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-elevated/60 border border-border-color rounded-xl p-3 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          ev.type === 'deadline'
                            ? 'error'
                            : ev.type === 'attendance'
                            ? 'success'
                            : 'warning'
                        }
                      >
                        {ev.type === 'deadline'
                          ? 'Assignment Deadline'
                          : ev.type === 'attendance'
                          ? 'Class Session'
                          : 'Announcement'}
                      </Badge>
                      <span className="font-bold text-primary-text">{ev.title}</span>
                    </div>
                    {ev.details && <p className="text-muted-text text-[11px]">{ev.details}</p>}
                  </div>

                  {ev.type === 'deadline' && ev.rawItem && onSelectMaterial && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onSelectMaterial(ev.rawItem)}
                    >
                      View
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
