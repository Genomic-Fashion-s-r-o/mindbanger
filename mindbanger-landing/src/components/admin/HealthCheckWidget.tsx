"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { AlertCircle, CheckCircle2, AlertTriangle, Loader2, Info } from "lucide-react";

export default function HealthCheckWidget() {
  const [loading, setLoading] = useState(true);
  const [missingDays, setMissingDays] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkSignalsHealth();
  }, []);

  async function checkSignalsHealth() {
    try {
      setLoading(true);
      setError(null);

      // Get dates for next 7 days starting from tomorrow
      const today = new Date();
      // Start checking from tomorrow (day 1) to day 7
      const targetDates: string[] = [];
      for (let i = 1; i <= 7; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        targetDates.push(d.toISOString().split("T")[0]);
      }

      // Format for query
      const minDate = targetDates[0];
      const maxDate = targetDates[targetDates.length - 1];

      // Query database for signals in this range
      const { data, error: dbError } = await supabase
        .from("daily_signals")
        .select("date")
        .gte("date", minDate)
        .lte("date", maxDate);

      if (dbError) throw dbError;

      // Extract existing dates
      const existingDates = new Set(data?.map((s: any) => s.date) || []);

      // Find which days out of 1-7 are missing
      const missingIndexes: number[] = [];
      targetDates.forEach((dateString, idx) => {
        if (!existingDates.has(dateString)) {
          // idx + 1 corresponds to how many days in the future
          missingIndexes.push(idx + 1);
        }
      });

      setMissingDays(missingIndexes);
    } catch (err: any) {
      console.error("Health check error:", err);
      setError(err.message || "Failed to check system health");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 flex items-center mb-6">
        <Loader2 className="w-5 h-5 text-slate-400 mr-3 animate-spin" />
        <span className="text-slate-400">Checking systems...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/20 rounded-2xl p-4 flex items-center mb-6 text-red-400">
        <AlertCircle className="w-5 h-5 mr-3 shrink-0" />
        <span>Check error: {error}</span>
      </div>
    );
  }

  const isHealthy = missingDays.length === 0;

  return (
    <div className={"rounded-2xl p-4 flex items-start mb-6 border " + (isHealthy ? "bg-emerald-900/10 border-emerald-500/20" : "bg-red-900/10 border-red-500/20")}>
      <div className="mr-3 mt-0.5 shrink-0">
        {isHealthy ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-red-500" />
        )}
      </div>
      
      <div>
        <h3 className={"font-medium " + (isHealthy ? "text-emerald-400" : "text-red-400")}>
          {isHealthy ? 'Service Status: All OK' : 'Critical Warning: Missing Content'}
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          {isHealthy 
            ? 'Content for the next 7 days is fully prepared in the database. Emails will go out as scheduled.'
            : ("Missing daily content for the following days (number of days from today): " + missingDays.join(", ") + ". Please add signals immediately, otherwise paying users will not receive their daily email!")}
        </p>
      </div>
      
      <button 
        onClick={checkSignalsHealth}
        className="ml-auto mt-0.5 text-xs bg-white/5 hover:bg-white/10 px-2 py-1 rounded transition-colors text-slate-300"
      >
        Refresh
      </button>
    </div>
  );
}
