import TournamentsView from "../TournamentsView";

export const dynamic = "force-dynamic";

export default async function SoftballTournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    division?: string;
    state?: string;
    q?: string;
  }>;
}) {
  const params = await searchParams;
  return <TournamentsView lockedSport="SOFTBALL" params={params} />;
}