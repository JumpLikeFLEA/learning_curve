import { createClient } from "@/lib/supabase/server";
import { getEnrichedResults } from "@/lib/questions";
import { redirect } from "next/navigation";
import { DashboardView } from "./DashboardView";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileRes, results] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, display_name, city, total_xp, current_streak, created_at")
      .eq("id", user.id)
      .single(),
    getEnrichedResults(supabase, user.id),
  ]);

  if (profileRes.error || !profileRes.data) {
    throw new Error(`Could not load profile: ${profileRes.error?.message ?? "unknown"}`);
  }

  return (
    <DashboardView
      userId={user.id}
      email={user.email ?? ""}
      profile={profileRes.data}
      results={results}
    />
  );
}
