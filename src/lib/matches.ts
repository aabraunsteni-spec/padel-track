import { supabase } from "@/lib/supabase";
import type { MatchFormat } from "@/lib/types";

export const validateSetScore = (a: number, b: number, format: MatchFormat) => {
  if (format === "bo1_4") {
    return (
      (a === 4 && b >= 0 && b <= 3) ||
      (b === 4 && a >= 0 && a <= 3)
    );
  }

  return (
    (a === 6 && b >= 0 && b <= 4) ||
    (b === 6 && a >= 0 && a <= 4) ||
    (a === 7 && (b === 5 || b === 6)) ||
    (b === 7 && (a === 5 || a === 6))
  );
};

export const getOrCreateFridaySession = async (sessionDate: string) => {
  const { data: existing, error: fetchError } = await supabase
    .from("sessions")
    .select("id")
    .eq("session_date", sessionDate)
    .eq("type", "viernes")
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await supabase
    .from("sessions")
    .insert({ session_date: sessionDate, type: "viernes" })
    .select("id")
    .single();

  if (insertError) throw insertError;
  return created.id;
};
