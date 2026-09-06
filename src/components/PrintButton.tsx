"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded-sm border border-steel/40 px-4 py-2 text-sm font-semibold hover:border-red hover:text-red"
    >
      Print roster
    </button>
  );
}
