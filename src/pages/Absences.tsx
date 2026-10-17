import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import PageHeader from "../components/PageHeader";
import { loadStats, goudiStreaks, fmtDate, type Streak } from "../lib/stats";
import { downloadExcel, downloadPdf, type Sheet } from "../lib/report";

export default function Absences() {
  const [list, setList] = useState<Streak[] | null>(null);
  const [sessions, setSessions] = useState(0);
  const [n, setN] = useState(3);
  const [mode, setMode] = useState<"current" | "ever">("current");
  const [error, setError] = useState("");

  useEffect(() => {
    loadStats().then((d) => {
      setList(goudiStreaks(d));
      setSessions(d.acts.filter((a) => a.typeName === "GOUDI ALJUMAH" && a.marked).length);
    }).catch((e) => setError(e.message));
  }, []);

  const rows = useMemo(() => (list || [])
    .filter((s) => (mode === "current" ? s.current : s.max) >= n)
    .sort((a, b) => (mode === "current" ? b.current - a.current : b.max - a.max)), [list, n, mode]);

  const sheet: Sheet = {
    name: `Absents ${n} Goudi consécutifs`,
    head: ["Nom", "Prénom", "Absences consécutives (en cours)", "Plus longue série", "Dates d'absence (Goudi)"],
    rows: rows.map((s) => [s.member.last_name, s.member.first_name, s.current, s.max, s.absentDates.slice(-Math.max(s.current, n)).map(fmtDate).join(", ")]),
  };

  if (error) return <div className="error-box">{error}</div>;
  if (!list) return <div className="center-screen">Chargement…</div>;

  return (
    <>
      <PageHeader title="Absences GOUDI ALJUMAH" description={`Membres absents ${n} GOUDI ALJUMAH consécutifs (${sessions} séance(s) avec appel).`}
        action={<div className="att-actions">
          <button className="secondary" onClick={() => downloadExcel("absents-goudi", [sheet])}><FileSpreadsheet size={18} /> Excel</button>
          <button className="secondary" onClick={() => downloadPdf("absents-goudi", `Absents ${n} GOUDI ALJUMAH consécutifs`, [sheet])}><FileText size={18} /> PDF</button>
        </div>} />

      <div className="panel" style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "end" }}>
        <label>Nombre d'absences consécutives
          <input type="number" min={1} value={n} onChange={(e) => setN(Math.max(1, Number(e.target.value) || 1))} style={{ width: 120 }} />
        </label>
        <div className="type-tabs" style={{ margin: 0 }}>
          <button className={`type-tab ${mode === "current" ? "on" : ""}`} onClick={() => setMode("current")}>Série en cours</button>
          <button className={`type-tab ${mode === "ever" ? "on" : ""}`} onClick={() => setMode("ever")}>Déjà arrivé (historique)</button>
        </div>
      </div>

      <div className="panel table-wrap">
        <table>
          <thead><tr><th>Nom</th><th>Prénom</th><th>Absences consécutives</th><th>Plus longue série</th></tr></thead>
          <tbody>{rows.map((s) => (
            <tr key={s.member.id}><td>{s.member.last_name}</td><td>{s.member.first_name}</td>
              <td><span className="badge inactive">{s.current}</span></td><td>{s.max}</td></tr>))}</tbody>
        </table>
        {!rows.length && <div className="empty">Aucun membre dans ce cas.</div>}
      </div>
      <p className="muted">« Série en cours » = absences à la suite jusqu'à la dernière séance. Dans une séance où l'appel a été fait, un membre non marqué est compté absent ; « Excusé » interrompt la série.</p>
    </>
  );
}
