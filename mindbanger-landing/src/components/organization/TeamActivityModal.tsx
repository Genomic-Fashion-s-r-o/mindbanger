'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Activity, CalendarDays, Calendar, Users } from 'lucide-react';
import toast from 'react-hot-toast';

type MemberProgress = {
  id: string;
  name: string;
  email: string;
  dailyLogs: string[];
  corpLogs: string[];
};

export default function TeamActivityModal({
  isOpen,
  onClose,
  orgId,
  lang,
}: {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  lang: string;
}) {
  const isSk = lang === 'sk' || lang === 'cs';
  const [loading, setLoading] = useState(false);
  const [membersData, setMembersData] = useState<MemberProgress[]>([]);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Prevent background scrolling when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const loadData = async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/b2b/activity?orgId=${orgId}&start=${start.toISOString()}&end=${end.toISOString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json || 'Chyba servera / Server error');
      setMembersData(json.members || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Compute the range based on currentDate and viewMode
  const getRange = (date: Date, mode: 'day' | 'week' | 'month'): { start: Date; end: Date; days: Date[] } => {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    const days: Date[] = [];

    if (mode === 'day') {
      days.push(new Date(start));
    } 
    else if (mode === 'week') {
      const dayOfWeek = start.getDay(); // 0(Sun) - 6(Sat)
      const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // shift back to Monday
      start.setDate(diff);

      end.setTime(start.getTime());
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);

      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        days.push(d);
      }
    } 
    else if (mode === 'month') {
      start.setDate(1);

      end.setTime(start.getTime());
      end.setMonth(start.getMonth() + 1);
      end.setDate(0); // last day of month
      end.setHours(23, 59, 59, 999);

      for (let i = 1; i <= end.getDate(); i++) {
        const d = new Date(start);
        d.setDate(i);
        days.push(d);
      }
    }
    return { start, end, days };
  };

  const { start, end, days } = getRange(currentDate, viewMode);

  useEffect(() => {
    if (isOpen) {
      loadData(start, end);
    }
  }, [isOpen, start.getTime(), end.getTime(), viewMode]);

  const handlePrev = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() - 1);
    if (viewMode === 'week') d.setDate(d.getDate() - 7);
    if (viewMode === 'month') d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const handleNext = () => {
    const d = new Date(currentDate);
    if (viewMode === 'day') d.setDate(d.getDate() + 1);
    if (viewMode === 'week') d.setDate(d.getDate() + 7);
    if (viewMode === 'month') d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const formatDateLabel = (d: Date) => {
    return d.toLocaleDateString(isSk ? 'sk-SK' : 'en-US', { weekday: 'short', day: 'numeric', month: 'numeric' });
  };

  const formatPeriodLabel = () => {
    if (viewMode === 'day') return currentDate.toLocaleDateString(isSk ? 'sk-SK' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (viewMode === 'week') return `${start.toLocaleDateString(isSk ? 'sk-SK' : 'en-US', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString(isSk ? 'sk-SK' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    if (viewMode === 'month') return currentDate.toLocaleDateString(isSk ? 'sk-SK' : 'en-US', { month: 'long', year: 'numeric' });
    return '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-6xl shadow-2xl max-h-[90vh] flex flex-col relative">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 shrink-0">
          <div>
            <h2 className="text-xl md:text-2xl font-serif text-white flex items-center gap-2">
              <Activity className="text-amber-500" size={24} />
              {isSk ? 'Štatistiky zamestnancov' : 'Employee Statistics'}
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              {isSk ? 'Prehľad počúvanosti denných a firemných mindsetov.' : 'Overview of daily and corporate mindset consumption.'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center p-4 md:px-6 bg-slate-950/50 border-b border-white/5 shrink-0 gap-4">
          
          {/* Modes */}
          <div className="flex bg-slate-900 rounded-lg p-1 border border-white/5 w-full md:w-auto">
             <button
                onClick={() => setViewMode('day')}
                className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'day' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
             >
                {isSk ? 'Deň' : 'Day'}
             </button>
             <button
                onClick={() => setViewMode('week')}
                className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'week' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
             >
                {isSk ? 'Týždeň' : 'Week'}
             </button>
             <button
                onClick={() => setViewMode('month')}
                className={`flex-1 md:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${viewMode === 'month' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
             >
                {isSk ? 'Mesiac' : 'Month'}
             </button>
          </div>

          {/* Date Slider */}
          <div className="flex items-center gap-4 bg-slate-900 px-4 py-1.5 rounded-lg border border-white/5">
             <button onClick={handlePrev} className="p-1 text-slate-400 hover:text-white transition">
                <ChevronLeft size={18} />
             </button>
             <div className="text-sm font-bold text-white min-w-[140px] text-center">
                {formatPeriodLabel()}
             </div>
             <button onClick={handleNext} disabled={end > new Date()} className="p-1 text-slate-400 hover:text-white transition disabled:opacity-30">
                <ChevronRight size={18} />
             </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs md:ml-auto border border-white/5 px-3 py-2 rounded-lg bg-slate-900/50">
             <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div>
                <span className="text-slate-300 font-medium">{isSk ? 'Osobné (Denné)' : 'Personal (Daily)'}</span>
             </div>
             <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                <span className="text-slate-300 font-medium">{isSk ? 'Firemné (Corp)' : 'Corporate (B2B)'}</span>
             </div>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto bg-slate-950 p-6 relative min-h-[300px]">
          {loading ? (
             <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-[2px]">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                {/* <p className="text-amber-500 mt-2 text-sm font-medium animate-pulse">{isSk ? 'Načítavam...' : 'Loading...'}</p> */}
             </div>
          ) : membersData.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Users size={48} className="mb-4 opacity-50" />
                <p>{isSk ? 'Žiadni aktívni zamestnanci na zobrazenie.' : 'No active employees to display.'}</p>
             </div>
          ) : (
             <div className="w-full relative">
                {/* Fixed first column structure for large tables */}
                <table className="w-full text-left text-sm whitespace-nowrap min-w-max border-collapse">
                   <thead>
                      <tr>
                         <th className="sticky top-0 bg-slate-950 z-20 py-3 pr-4 border-b border-white/10 font-medium text-slate-400 w-64 max-w-[200px] truncate">
                            {isSk ? 'E-mail / Meno zamestnanca' : 'Employee Mail / Name'}
                         </th>
                         {days.map((d, i) => (
                            <th key={i} className="sticky top-0 bg-slate-950 z-10 p-3 border-b border-white/10 text-center font-medium text-xs text-slate-500 w-12 min-w-[50px] border-l border-white/5 first:border-l-0">
                               <div className="flex flex-col items-center gap-1">
                                  <span>{d.toLocaleDateString(isSk ? 'sk-SK' : 'en-US', { weekday: 'short' })}</span>
                                  <span className="text-white text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">{d.getDate()}</span>
                               </div>
                            </th>
                         ))}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                      {membersData.map((member) => (
                         <tr key={member.id} className="hover:bg-slate-900/50 transition duration-150">
                            <td className="py-3 pr-4 relative">
                               <div className="font-medium text-slate-200 truncate pr-4 max-w-[250px]" title={member.email}>
                                  {member.email}
                               </div>
                               {member.name && member.name !== member.email && (
                                  <div className="text-[10px] text-slate-500 truncate max-w-[250px] mt-0.5">
                                     {member.name}
                                  </div>
                               )}
                            </td>
                            {days.map((d, i) => {
                               const dateStr = d.toISOString().split('T')[0];
                               const hasDaily = member.dailyLogs.includes(dateStr);
                               const hasCorp = member.corpLogs.includes(dateStr);

                               return (
                                  <td key={i} className="p-3 text-center align-middle border-l border-white/5 first:border-l-0">
                                     <div className="flex items-center justify-center gap-1.5">
                                        {hasDaily && (
                                           <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.8)]" title={isSk ? "Denný reset splnený" : "Daily reset completed"}></div>
                                        )}
                                        {hasCorp && (
                                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.8)]" title={isSk ? "Firemný obsah splnený" : "Corporate content completed"}></div>
                                        )}
                                        {!hasDaily && !hasCorp && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-800/50 mix-blend-overlay mx-auto"></div>
                                        )}
                                     </div>
                                  </td>
                               );
                            })}
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}