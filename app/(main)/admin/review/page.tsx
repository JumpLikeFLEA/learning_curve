import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPendingQuestions } from "@/lib/questions";
import { ReviewQueue } from "./ReviewQueue";

const PAGE_SIZE = 10;

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminReviewPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="size-12 text-muted-foreground mb-4" />
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="text-muted-foreground mt-2">
          You need admin privileges to access this page.
        </p>
      </div>
    );
  }

  const { page: pageParam } = await searchParams;
  const requestedPage = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const { questions, total } = await getPendingQuestions(requestedPage, PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // If user is on a page that no longer exists (e.g., after bulk approving),
  // redirect to the new last page.
  if (requestedPage > totalPages && total > 0) {
    redirect(`/admin/review?page=${totalPages}`);
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Review Queue</h1>
        <p className="text-muted-foreground mt-1">
          {total === 0
            ? "No questions awaiting review."
            : `${total} pending question${total === 1 ? "" : "s"} awaiting review.`}
        </p>
      </div>
      <ReviewQueue
        initial={questions}
        currentPage={requestedPage}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE}
      />
    </div>
  );
}
