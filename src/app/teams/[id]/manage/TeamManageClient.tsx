"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type Staff = {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  email: string | null;
  isHousingContact: boolean;
  backgroundCheckStatus: string;
  backgroundCheckFileName: string | null;
};

type TeamDoc = {
  id: string;
  label: string;
  fileUrl: string;
  fileName: string;
};

type PlayerRow = {
  id: string;
  firstName: string;
  lastName: string;
  jerseyNumber: string | null;
  position: string | null;
  backgroundCheckStatus: string;
  backgroundCheckFileName: string | null;
};

type EventRow = {
  id: string;
  tournamentName: string;
  division: string;
  startDate: string;
  endDate: string;
  status: string;
};

const TABS = ["Team Info", "Staff", "Players", "Documents", "Tournament History"] as const;
type Tab = (typeof TABS)[number];

export default function TeamManageClient({
  team,
  staff,
  documents,
  players,
  upcomingEvents,
  pastEvents,
}: {
  team: {
    id: string;
    name: string;
    organization: string | null;
    ageGroup: string;
    homeCity: string | null;
    homeState: string;
    logoUrl: string | null;
  };
  staff: Staff[];
  documents: TeamDoc[];
  players: PlayerRow[];
  upcomingEvents: EventRow[];
  pastEvents: EventRow[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("Team Info");
  const [logoUrl, setLogoUrl] = useState(team.logoUrl);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/teams/${team.id}/logo`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      setLogoUrl(data.url);
    }
    setUploadingLogo(false);
    if (logoInputRef.current) logoInputRef.current.value = "";
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-navy px-6 py-5 text-white">
        <Link href={`/teams/${team.id}`} className="text-sm text-white/60 hover:text-white">
          Back to team page
        </Link>
        <h1 className="display mt-1 text-2xl">Manage {team.name}</h1>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-8">
        <div className="flex flex-wrap gap-2 border-b border-steel/20">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-semibold ${
                activeTab === tab
                  ? "border-b-2 border-red text-red"
                  : "text-ink/60 hover:text-ink"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {activeTab === "Team Info" && (
            <div className="rounded-sm border border-steel/20 bg-white p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/60">
                Team logo
              </h2>
              <div className="mt-3 flex items-center gap-4">
                {logoUrl ? (
                  <div className="relative h-24 w-24 overflow-hidden rounded-sm border border-steel/20">
                    <Image src={logoUrl} alt="Team logo" fill className="object-cover" />
                  </div>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-sm border-2 border-dashed border-steel/40 text-xs text-ink/40">
                    No logo
                  </div>
                )}
                <button
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="rounded-sm border border-steel/40 px-4 py-2 text-sm font-semibold hover:border-red hover:text-red disabled:opacity-50"
                >
                  {uploadingLogo ? "Uploading..." : logoUrl ? "Replace logo" : "Upload logo"}
                </button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Team name</p>
                  <p className="mt-1 font-semibold">{team.name}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Division</p>
                  <p className="mt-1 font-semibold">{team.ageGroup}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Home city</p>
                  <p className="mt-1 font-semibold">
                    {team.homeCity ? `${team.homeCity}, ${team.homeState}` : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-ink/50">Organization</p>
                  <p className="mt-1 font-semibold">{team.organization ?? "-"}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "Staff" && <StaffTab teamId={team.id} initialStaff={staff} />}

          {activeTab === "Players" && <PlayersTab initialPlayers={players} />}

          {activeTab === "Documents" && (
            <DocumentsTab teamId={team.id} initialDocuments={documents} />
          )}

          {activeTab === "Tournament History" && (
            <TournamentHistoryTab upcoming={upcomingEvents} past={pastEvents} />
          )}
        </div>
      </div>
    </div>
  );
}

function StaffTab({
  teamId,
  initialStaff,
}: {
  teamId: string;
  initialStaff: Staff[];
}) {
  const [staffList, setStaffList] = useState(initialStaff);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isHousingContact, setIsHousingContact] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!name.trim() || !role.trim()) return;
    setSubmitting(true);

    const res = await fetch(`/api/teams/${teamId}/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, phone, email, isHousingContact }),
    });

    if (res.ok) {
      const data = await res.json();
      setStaffList((prev) => [...prev, { ...data.staff, backgroundCheckFileName: null }]);
      setName("");
      setRole("");
      setPhone("");
      setEmail("");
      setIsHousingContact(false);
    }
    setSubmitting(false);
  }

  async function handleRemove(id: string) {
    const res = await fetch(`/api/teams/${teamId}/staff/${id}`, { method: "DELETE" });
    if (res.ok) {
      setStaffList((prev) => prev.filter((s) => s.id !== id));
    }
  }

  async function handleUploadCheck(staffId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(
      `/api/teams/${teamId}/staff/${staffId}/background-check`,
      { method: "POST", body: formData }
    );
    if (res.ok) {
      const data = await res.json();
      setStaffList((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, ...data.staff } : s))
      );
    }
  }

  return (
    <div className="rounded-sm border border-steel/20 bg-white p-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-steel/30 text-left text-ink/50">
            <th className="py-2">Name</th>
            <th>Role</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Background check</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {staffList.map((s) => (
            <tr key={s.id} className="border-b border-steel/10">
              <td className="py-3 font-semibold">
                {s.name}
                {s.isHousingContact && (
                  <span className="ml-2 rounded-sm bg-gold/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink/70">
                    Housing
                  </span>
                )}
              </td>
              <td>{s.role}</td>
              <td>{s.phone ?? "-"}</td>
              <td>{s.email ?? "-"}</td>
              <td>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      s.backgroundCheckStatus === "APPROVED"
                        ? "bg-green-600"
                        : s.backgroundCheckStatus === "SUBMITTED"
                        ? "bg-gold"
                        : "bg-steel/40"
                    }`}
                  />
                  <button
                    onClick={() => fileInputs.current[s.id]?.click()}
                    className="text-xs font-semibold text-red hover:text-red-dark"
                  >
                    {s.backgroundCheckFileName ? "Replace" : "Upload"}
                  </button>
                  <input
                    ref={(el) => {
                      fileInputs.current[s.id] = el;
                    }}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadCheck(s.id, file);
                    }}
                  />
                </div>
              </td>
              <td>
                <button
                  onClick={() => handleRemove(s.id)}
                  className="text-xs font-semibold text-red hover:text-red-dark"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
          {staffList.length === 0 && (
            <tr>
              <td colSpan={6} className="py-6 text-center text-ink/50">
                No staff added yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <form onSubmit={handleAdd} className="mt-6 grid grid-cols-2 gap-3 border-t border-steel/20 pt-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role (e.g. Head Coach)"
          className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Phone"
          className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
        <label className="col-span-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isHousingContact}
            onChange={(e) => setIsHousingContact(e.target.checked)}
          />
          Housing contact
        </label>
        <button
          type="submit"
          disabled={submitting}
          className="col-span-2 rounded-sm bg-red px-5 py-2 text-sm font-semibold text-white hover:bg-red-dark disabled:opacity-60"
        >
          {submitting ? "Adding..." : "+ Add Team Staff"}
        </button>
      </form>
    </div>
  );
}

function PlayersTab({ initialPlayers }: { initialPlayers: PlayerRow[] }) {
  const [playerList, setPlayerList] = useState(initialPlayers);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleUploadCheck(playerId: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/players/${playerId}/background-check`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      setPlayerList((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, ...data.player } : p))
      );
    }
  }

  return (
    <div className="rounded-sm border border-steel/20 bg-white p-6">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-steel/30 text-left text-ink/50">
            <th className="py-2">Name</th>
            <th>#</th>
            <th>Position</th>
            <th>Background check</th>
          </tr>
        </thead>
        <tbody>
          {playerList.map((p) => (
            <tr key={p.id} className="border-b border-steel/10">
              <td className="py-3 font-semibold">
                {p.firstName} {p.lastName}
              </td>
              <td>{p.jerseyNumber ?? "-"}</td>
              <td>{p.position ?? "-"}</td>
              <td>
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      p.backgroundCheckStatus === "APPROVED"
                        ? "bg-green-600"
                        : p.backgroundCheckStatus === "SUBMITTED"
                        ? "bg-gold"
                        : "bg-steel/40"
                    }`}
                  />
                  <button
                    onClick={() => fileInputs.current[p.id]?.click()}
                    className="text-xs font-semibold text-red hover:text-red-dark"
                  >
                    {p.backgroundCheckFileName ? "Replace" : "Upload"}
                  </button>
                  <input
                    ref={(el) => {
                      fileInputs.current[p.id] = el;
                    }}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadCheck(p.id, file);
                    }}
                  />
                </div>
              </td>
            </tr>
          ))}
          {playerList.length === 0 && (
            <tr>
              <td colSpan={4} className="py-6 text-center text-ink/50">
                No players on this roster yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DocumentsTab({
  teamId,
  initialDocuments,
}: {
  teamId: string;
  initialDocuments: TeamDoc[];
}) {
  const [docs, setDocs] = useState(initialDocuments);
  const [label, setLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("label", label || file.name);

    const res = await fetch(`/api/teams/${teamId}/documents`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) {
      const data = await res.json();
      setDocs((prev) => [data.document, ...prev]);
      setLabel("");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleRemove(id: string) {
    const res = await fetch(`/api/teams/${teamId}/documents/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setDocs((prev) => prev.filter((d) => d.id !== id));
    }
  }

  return (
    <div className="rounded-sm border border-steel/20 bg-white p-6">
      <div className="space-y-2">
        {docs.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between border-b border-steel/10 py-2 text-sm"
          >
            <a
              href={d.fileUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-red hover:text-red-dark"
            >
              {d.label}
            </a>
            <button
              onClick={() => handleRemove(d.id)}
              className="text-xs font-semibold text-ink/50 hover:text-red"
            >
              Remove
            </button>
          </div>
        ))}
        {docs.length === 0 && (
          <p className="py-6 text-center text-sm text-ink/50">
            No documents uploaded yet.
          </p>
        )}
      </div>

      <div className="mt-6 flex gap-3 border-t border-steel/20 pt-6">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Document name (optional)"
          className="flex-1 rounded-sm border border-steel/40 px-3 py-2 text-sm"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-sm bg-red px-5 py-2 text-sm font-semibold text-white hover:bg-red-dark disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "+ Upload document"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  );
}

function TournamentHistoryTab({
  upcoming,
  past,
}: {
  upcoming: EventRow[];
  past: EventRow[];
}) {
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const list = view === "upcoming" ? upcoming : past;

  return (
    <div className="rounded-sm border border-steel/20 bg-white p-6">
      <div className="flex gap-2">
        <button
          onClick={() => setView("upcoming")}
          className={`rounded-sm px-4 py-2 text-sm font-semibold ${
            view === "upcoming" ? "bg-navy text-white" : "border border-steel/40 text-ink/60"
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setView("past")}
          className={`rounded-sm px-4 py-2 text-sm font-semibold ${
            view === "past" ? "bg-navy text-white" : "border border-steel/40 text-ink/60"
          }`}
        >
          Past
        </button>
        <Link
          href="/tournaments"
          className="ml-auto rounded-sm border border-steel/40 px-4 py-2 text-sm font-semibold hover:border-red hover:text-red"
        >
          Register for event
        </Link>
      </div>

      <div className="mt-4 space-y-3">
        {list.map((e) => (
          <div key={e.id} className="rounded-sm border border-steel/20 p-4">
            <p className="font-semibold">{e.tournamentName}</p>
            <p className="text-sm text-ink/60">
              {new Date(e.startDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              -{" "}
              {new Date(e.endDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              - {e.division}
            </p>
            <span
              className={`mt-2 inline-block rounded-sm px-2 py-1 text-xs font-semibold uppercase ${
                e.status === "PAID"
                  ? "bg-green-100 text-green-700"
                  : "bg-gold/20 text-ink/70"
              }`}
            >
              {e.status}
            </span>
          </div>
        ))}
        {list.length === 0 && (
          <p className="py-6 text-center text-sm text-ink/50">
            No {view} tournaments.
          </p>
        )}
      </div>
    </div>
  );
}
