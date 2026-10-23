"use client";

/** Afdrukken; klapt eerst alle vragen open zodat ze mee op papier komen. */
export default function AfdrukKnop() {
  return (
    <button
      type="button"
      className="btn btn-line"
      onClick={() => {
        document.querySelectorAll("details").forEach((d) => (d.open = true));
        window.print();
      }}
    >
      Afdrukken
    </button>
  );
}
