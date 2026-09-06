type RosterRow = {
  firstName: string;
  lastName: string;
  jerseyNumber: string | null;
  position: string | null;
};

// Hidden on screen (Tailwind's `hidden`), shown only when printing
// (`print:block`). Pairs with a "Print roster" button that calls
// window.print() -- the rest of the page uses `print:hidden` so only
// this clean, ink-friendly table actually prints.
export default function PrintableRoster({
  title,
  subtitle,
  players,
}: {
  title: string;
  subtitle: string;
  players: RosterRow[];
}) {
  return (
    <div className="hidden print:block">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
      <p className="mt-1 text-xs text-gray-500">
        {players.length} player{players.length === 1 ? "" : "s"}
      </p>
      <table className="mt-6 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2">Name</th>
            <th className="py-2">#</th>
            <th className="py-2">Position</th>
          </tr>
        </thead>
        <tbody>
          {players.map((p, i) => (
            <tr key={i} className="border-b border-gray-300">
              <td className="py-2">
                {p.firstName} {p.lastName}
              </td>
              <td className="py-2">{p.jerseyNumber ?? ""}</td>
              <td className="py-2">{p.position ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
