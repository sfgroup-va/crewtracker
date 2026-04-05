'use client';

import * as React from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
         startOfYear, endOfYear, startOfDay, endOfDay, subWeeks, addWeeks, isSameDay, 
         isSameMonth, isBefore, isAfter, isWithinInterval } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar, Download, X, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';

// ===== DATE RANGE PICKER COMPONENT =====

interface DateRange {
  from: Date;
  to: Date;
}

interface DateRangePickerProps {
  dateRange: DateRange | null;
  onDateRangeChange: (range: DateRange) => void;
  className?: string;
}

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
const DAYS_SHORT = ['Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb', 'Mg'];

// Preset options
const PRESETS = [
  { label: 'Hari Ini', getValue: () => { const d = new Date(); return { from: startOfDay(d), to: endOfDay(d) }; } },
  { label: 'Kemarin', getValue: () => { const d = subDays(new Date(), 1); return { from: startOfDay(d), to: endOfDay(d) }; } },
  { label: 'Minggu Ini', getValue: () => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    return { from: start, to: endOfDay(now) };
  }},
  { label: 'Minggu Lalu', getValue: () => {
    const now = new Date();
    const start = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    const end = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
    return { from: start, to: end };
  }},
  { label: '2 Minggu Terakhir', getValue: () => {
    const now = new Date();
    const start = startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 });
    return { from: start, to: endOfDay(now) };
  }},
  { label: 'Bulan Ini', getValue: () => {
    const now = new Date();
    return { from: startOfMonth(now), to: endOfDay(now) };
  }},
  { label: 'Bulan Lalu', getValue: () => {
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
  }},
  { label: 'Tahun Ini', getValue: () => {
    const now = new Date();
    return { from: startOfYear(now), to: endOfDay(now) };
  }},
];

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}

function CalendarMonth({
  month,
  selectedFrom,
  selectedTo,
  hoverDay,
  onDayClick,
  onDayHover,
  isLeft,
}: {
  month: Date;
  selectedFrom: Date | null;
  selectedTo: Date | null;
  hoverDay: Date | null;
  onDayClick: (day: Date) => void;
  onDayHover: (day: Date | null) => void;
  isLeft: boolean;
}) {
  const monthStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const monthEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days: Date[] = [];
  let current = new Date(monthStart);
  while (current <= monthEnd) {
    days.push(new Date(current));
    current = new Date(current);
    current.setDate(current.getDate() + 1);
  }

  return (
    <div className="flex-1 min-w-[240px]">
      {/* Month Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-sm font-semibold text-slate-900">
          {MONTHS_ID[month.getMonth()]} {month.getFullYear()}
        </span>
      </div>

      {/* Day Headers */}
      <div className="grid grid-cols-7 px-2">
        {DAYS_SHORT.map(day => (
          <div key={day} className="text-center text-xs font-medium text-slate-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Day Grid */}
      <div className="grid grid-cols-7 px-2 gap-0.5">
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, month);
          const isSelectedFrom = selectedFrom && isSameDay(day, selectedFrom);
          const isSelectedTo = selectedTo && isSameDay(day, selectedTo);
          const isSelected = isSelectedFrom || isSelectedTo;
          const isInRange = selectedFrom && selectedTo && isWithinInterval(day, { start: selectedFrom, end: selectedTo });
          const isHoverRange = selectedFrom && !selectedTo && hoverDay && (
            (isSameDay(day, selectedFrom) || isSameDay(day, hoverDay) ||
             isWithinInterval(day, { 
               start: isBefore(day, selectedFrom) ? day : selectedFrom, 
               end: isBefore(day, selectedFrom) ? selectedFrom : day 
             }))
          );
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={idx}
              onClick={() => isCurrentMonth && onDayClick(day)}
              onMouseEnter={() => isCurrentMonth && onDayHover(day)}
              onMouseLeave={() => onDayHover(null)}
              disabled={!isCurrentMonth}
              className={cn(
                'relative h-8 w-full text-xs rounded-md transition-all duration-100',
                !isCurrentMonth && 'text-transparent cursor-default',
                isCurrentMonth && !isSelected && !isInRange && !isHoverRange && 'text-slate-700 hover:bg-slate-100',
                isToday && !isSelected && 'font-bold text-blue-600',
                isSelected && 'bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-sm',
                isInRange && !isSelected && 'bg-blue-50 text-blue-700',
                isHoverRange && !isSelected && !isInRange && 'bg-blue-100/70 text-blue-600',
              )}
            >
              {isCurrentMonth && (
                <>
                  <span className="relative z-10">{day.getDate()}</span>
                  {isSelectedFrom && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full" />
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DateRangePicker({ dateRange, onDateRangeChange, className }: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [leftMonth, setLeftMonth] = React.useState<DateRange | null>(dateRange);
  const [rightMonth, setRightMonth] = React.useState(addMonths(new Date(), 1));
  const [selectionState, setSelectionState] = React.useState<'from' | 'to'>('from');
  const [tempFrom, setTempFrom] = React.useState<Date | null>(dateRange?.from || null);
  const [tempTo, setTempTo] = React.useState<Date | null>(dateRange?.to || null);
  const [hoverDay, setHoverDay] = React.useState<Date | null>(null);
  const [activePreset, setActivePreset] = React.useState<string | null>(null);

  // Sync left month when date range changes
  React.useEffect(() => {
    if (dateRange) {
      setLeftMonth(dateRange.from);
      setRightMonth(addMonths(dateRange.from, 1));
      setTempFrom(dateRange.from);
      setTempTo(dateRange.to);
    }
  }, [dateRange, open]);

  const handleDayClick = (day: Date) => {
    if (selectionState === 'from') {
      setTempFrom(day);
      setTempTo(null);
      setSelectionState('to');
      setActivePreset(null);
      // If clicked day is after current rightMonth start, shift months
      if (isAfter(day, endOfMonth(rightMonth))) {
        setLeftMonth(startOfMonth(day));
        setRightMonth(addMonths(startOfMonth(day), 1));
      }
    } else {
      const from = tempFrom || day;
      const to = day;
      // Ensure from <= to
      const range = isBefore(from, to) ? { from, to } : { from: to, to: from };
      setTempFrom(range.from);
      setTempTo(range.to);
      setActivePreset(null);
    }
  };

  const handlePresetClick = (preset: typeof PRESETS[number]) => {
    const range = preset.getValue();
    setTempFrom(range.from);
    setTempTo(range.to);
    setLeftMonth(startOfMonth(range.from));
    setRightMonth(addMonths(startOfMonth(range.from), 1));
    setActivePreset(preset.label);
    setSelectionState('from');
  };

  const handleApply = () => {
    if (tempFrom && tempTo) {
      onDateRangeChange({ from: tempFrom, to: tempTo });
      setOpen(false);
    }
  };

  const handleClear = () => {
    setTempFrom(null);
    setTempTo(null);
    setActivePreset(null);
    setSelectionState('from');
  };

  const handlePrevMonth = () => {
    setLeftMonth(prev => subMonths(prev || new Date(), 1));
    setRightMonth(prev => subMonths(prev || new Date(), 1));
  };

  const handleNextMonth = () => {
    setLeftMonth(prev => addMonths(prev || new Date(), 1));
    setRightMonth(prev => addMonths(prev || new Date(), 1));
  };

  const displayText = dateRange
    ? `${format(dateRange.from, 'dd/MM/yyyy', { locale: localeId })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: localeId })}`
    : 'Pilih tanggal...';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors text-sm',
            !dateRange && 'text-slate-400',
            className
          )}
        >
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className={dateRange ? 'text-slate-900 font-medium' : ''}>{displayText}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 shadow-xl border-slate-200" align="start">
        <div className="flex">
          {/* Presets Sidebar */}
          <div className="w-[140px] border-r border-slate-100 bg-slate-50/50 py-3 px-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Rentang</p>
            <div className="space-y-0.5">
              {PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                    activePreset === preset.label
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dual Calendar */}
          <div className="flex flex-col">
            {/* Navigation */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
              <button onClick={handlePrevMonth} className="p-1 rounded-md hover:bg-slate-100 transition-colors">
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <div className="flex items-center gap-1">
                {tempFrom && (
                  <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                    {format(tempFrom, 'dd MMM', { locale: localeId })}
                  </span>
                )}
                {tempFrom && tempTo && (
                  <span className="text-slate-300">—</span>
                )}
                {tempTo && (
                  <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                    {format(tempTo, 'dd MMM', { locale: localeId })}
                  </span>
                )}
              </div>
              <button onClick={handleNextMonth} className="p-1 rounded-md hover:bg-slate-100 transition-colors">
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            {/* Calendars */}
            <div className="flex divide-x divide-slate-100 py-2">
              <CalendarMonth
                month={leftMonth || new Date()}
                selectedFrom={tempFrom}
                selectedTo={tempTo}
                hoverDay={hoverDay}
                onDayClick={handleDayClick}
                onDayHover={setHoverDay}
                isLeft
              />
              <CalendarMonth
                month={rightMonth || addMonths(new Date(), 1)}
                selectedFrom={tempFrom}
                selectedTo={tempTo}
                hoverDay={hoverDay}
                onDayClick={handleDayClick}
                onDayHover={setHoverDay}
                isLeft={false}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between px-3 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={handleClear}
                className="text-xs text-slate-500 hover:text-slate-700 font-medium transition-colors"
              >
                Reset
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 transition-colors rounded-md"
                >
                  Batal
                </button>
                <button
                  onClick={handleApply}
                  disabled={!tempFrom || !tempTo}
                  className={cn(
                    'px-4 py-1.5 text-xs font-semibold rounded-md transition-colors',
                    tempFrom && tempTo
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  )}
                >
                  Terapkan
                </button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ===== EXPORT PDF BUTTON COMPONENT =====

interface ExportPdfButtonProps {
  userId: string;
  userName?: string;
  className?: string;
}

export function ExportPdfButton({ userId, userName, className }: ExportPdfButtonProps) {
  const [dateRange, setDateRange] = React.useState<DateRange | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const handleExport = async () => {
    if (!dateRange) {
      toast.error('Pilih rentang tanggal terlebih dahulu');
      return;
    }

    setExporting(true);
    try {
      const fromDateStr = format(dateRange.from, 'yyyy-MM-dd');
      const toDateStr = format(dateRange.to, 'yyyy-MM-dd');

      // Add 1 day to toDate to include the full end date
      const toDateAdjusted = new Date(dateRange.to);
      toDateAdjusted.setDate(toDateAdjusted.getDate() + 1);
      const toDateAdjustedStr = format(toDateAdjusted, 'yyyy-MM-dd');

      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          fromDate: fromDateStr,
          toDate: toDateAdjustedStr,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Gagal generate PDF' }));
        toast.error(err.error || 'Gagal generate PDF');
        return;
      }

      // Download the PDF
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan_Jam_Kerja_${(userName || 'User').replace(/\s+/g, '_')}_${fromDateStr}_${fromDateStr}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('PDF berhasil diunduh!');
    } catch {
      toast.error('Terjadi kesalahan saat mengunduh PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <DateRangePicker
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />
      <Button
        onClick={handleExport}
        disabled={!dateRange || exporting}
        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shrink-0"
        size="sm"
      >
        {exporting ? (
          <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span className="hidden sm:inline">Export PDF</span>
      </Button>
    </div>
  );
}
