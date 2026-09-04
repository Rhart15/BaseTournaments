import { redirect } from "next/navigation";

// This standalone bracket page has been folded into the unified division
// page (Schedule / Standings / Results / Brackets tabs). Old links and
// bookmarks land here and get sent straight to that page's Brackets tab.
export default async function LegacyBracketRedirect({
  params,
}: {
  params: Promise<{ id: string; divisionId: string }>;
}) {
  const { id, divisionId } = await params;
  redirect(`/tournaments/${id}/divisions/${divisionId}?tab=brackets`);
}
