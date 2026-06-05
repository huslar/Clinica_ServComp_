import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icons";
import { patientService } from "../services/patientService";
import { periodontogramService } from "../services/periodontogramService";

const quadrants = [
  { title: "Superior derecho", teeth: ["18", "17", "16", "15", "14", "13", "12", "11"], side: "Buccal" },
  { title: "Superior izquierdo", teeth: ["21", "22", "23", "24", "25", "26", "27", "28"], side: "Buccal" },
  { title: "Inferior izquierdo", teeth: ["38", "37", "36", "35", "34", "33", "32", "31"], side: "Lingual" },
  { title: "Inferior derecho", teeth: ["41", "42", "43", "44", "45", "46", "47", "48"], side: "Lingual" },
];
const periodontalSets = [
  { id: "all", label: "Todos", description: "Vista completa de los cuatro sets", bands: [
    { quadrantIndex: 0, surface: "buccal" },
    { quadrantIndex: 1, surface: "buccal" },
    { quadrantIndex: 2, surface: "lingual" },
    { quadrantIndex: 3, surface: "lingual" },
  ] },
  { id: "buccal-upper-right", label: "Buccal Superior derecho", description: "Piezas 18 a 11, superficie buccal", bands: [{ quadrantIndex: 0, surface: "buccal" }] },
  { id: "buccal-upper-left", label: "Buccal Superior izquierdo", description: "Piezas 21 a 28, superficie buccal", bands: [{ quadrantIndex: 1, surface: "buccal" }] },
  { id: "lingual-lower-left", label: "Lingual Inferior izquierdo", description: "Piezas 38 a 31, superficie lingual", bands: [{ quadrantIndex: 2, surface: "lingual" }] },
  { id: "lingual-lower-right", label: "Lingual Inferior derecho", description: "Piezas 41 a 48, superficie lingual", bands: [{ quadrantIndex: 3, surface: "lingual" }] },
];
const allTeeth = quadrants.flatMap((quadrant) => quadrant.teeth);
const siteRows = {
  buccal: ["MV", "V", "DV"],
  lingual: ["MP", "P", "DP"],
};
const siteLabels = { MV: "M", V: "C", DV: "D", MP: "M", P: "C", DP: "D" };

function defaultMeasurement(tooth, site) {
  return { tooth, site, probingDepth: 2, gingivalMargin: 0, bleeding: false, suppuration: false, plaque: false, furcation: false, implant: false, mobility: 0 };
}

function makeInitialChart() {
  const sites = [...siteRows.buccal, ...siteRows.lingual];
  return Object.fromEntries(allTeeth.flatMap((tooth) => sites.map((site) => [`${tooth}-${site}`, defaultMeasurement(tooth, site)])));
}

function metric(chart, tooth, site) {
  return chart[`${tooth}-${site}`] || defaultMeasurement(tooth, site);
}

function pathFor(teeth, chart, sites, field, scale = 6, baseline = 58) {
  const points = teeth.flatMap((tooth, toothIndex) => sites.map((site, siteIndex) => {
    const measurement = metric(chart, tooth, site);
    const value = Number(measurement[field] || 0);
    return `${toothIndex * 66 + siteIndex * 19 + 17},${baseline - value * scale}`;
  }));
  return points.length ? `M ${points.join(" L ")}` : "";
}

function boolSummary(teeth, chart, field) {
  return teeth.map((tooth) => [...siteRows.buccal, ...siteRows.lingual].some((site) => metric(chart, tooth, site)[field]));
}

export function PeriodontogramGraphicModule({ onNotify, setMode = false }) {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [chart, setChart] = useState(makeInitialChart);
  const [selectedSet, setSelectedSet] = useState("all");
  const [diagnosis, setDiagnosis] = useState("");
  const [planning, setPlanning] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    patientService.list().then((items) => {
      setPatients(items.filter((item) => item.estado === "Activo"));
      if (items[0]) setPatientId(String(items[0].id));
    }).catch((error) => onNotify(error.message));
  }, []);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    periodontogramService.get(patientId)
      .then((data) => {
        const next = makeInitialChart();
        data.measurements.forEach((item) => {
          next[`${item.tooth}-${item.site}`] = {
            tooth: item.tooth,
            site: item.site,
            probingDepth: Number(item.probingDepth),
            gingivalMargin: Number(item.gingivalMargin),
            bleeding: Boolean(item.bleeding),
            suppuration: Boolean(item.suppuration),
            plaque: Boolean(item.plaque),
            furcation: Boolean(item.furcation),
            implant: Boolean(item.implant),
            mobility: Number(item.mobility),
          };
        });
        setChart(next);
        setRecord(data.record);
        setDiagnosis(data.record?.diagnosis || "");
        setPlanning(data.record?.planning || "");
        setFollowUp(data.record?.followUp || "");
      })
      .catch((error) => onNotify(error.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  const summary = useMemo(() => {
    const measurements = Object.values(chart);
    return {
      pockets: measurements.filter((item) => item.probingDepth >= 4).length,
      severe: measurements.filter((item) => item.probingDepth >= 6).length,
      bleeding: measurements.filter((item) => item.bleeding).length,
      suppuration: measurements.filter((item) => item.suppuration).length,
      plaque: measurements.filter((item) => item.plaque).length,
    };
  }, [chart]);
  const activeSet = periodontalSets.find((item) => item.id === selectedSet) || periodontalSets[0];
  const visibleBands = setMode ? activeSet.bands : periodontalSets[0].bands;

  function setValue(tooth, site, field, value) {
    setChart((current) => ({ ...current, [`${tooth}-${site}`]: { ...metric(current, tooth, site), [field]: value } }));
  }

  function setMobility(tooth, value) {
    setChart((current) => {
      const next = { ...current };
      [...siteRows.buccal, ...siteRows.lingual].forEach((site) => {
        next[`${tooth}-${site}`] = { ...metric(current, tooth, site), mobility: value };
      });
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const saved = await periodontogramService.save(patientId, {
        diagnosis,
        planning,
        followUp,
        measurements: Object.values(chart),
      });
      setRecord(saved.record);
      onNotify(setMode ? "Periodontograma por set guardado correctamente" : "Periodontograma grafico guardado correctamente");
    } catch (error) {
      onNotify(error.message);
    } finally {
      setSaving(false);
    }
  }

  function NumericRow({ label, teeth, sites, field, min, max }) {
    return <tr><th>{label}</th>{teeth.map((tooth) => <td key={tooth}>{sites.map((site) => {
      const value = metric(chart, tooth, site)[field];
      return <input key={site} className={field === "probingDepth" && value >= 4 ? "perio-red-value" : ""} type="number" min={min} max={max} value={value} title={`${tooth} ${site}`} onChange={(event) => setValue(tooth, site, field, Number(event.target.value))} />;
    })}</td>)}</tr>;
  }

  function BooleanRow({ label, teeth, sites, field, color }) {
    return <tr><th>{label}</th>{teeth.map((tooth) => <td key={tooth}>{sites.map((site) => {
      const active = metric(chart, tooth, site)[field];
      return <button key={site} className={`perio-square ${color} ${active ? "active" : ""}`} title={`${tooth} ${site}`} onClick={() => setValue(tooth, site, field, !active)} />;
    })}</td>)}</tr>;
  }

  function ToothBand({ quadrant, surface }) {
    const sites = siteRows[surface];
    return (
      <section className="perio2-band">
        <div className="perio2-band-label"><strong>{quadrant.side}</strong><small>{quadrant.title}</small></div>
        <div className="perio2-table-wrap">
          <table className="perio2-table">
            <thead><tr><th />{quadrant.teeth.map((tooth) => <th key={tooth}>{tooth}</th>)}</tr></thead>
            <tbody>
              <tr><th>Mobility</th>{quadrant.teeth.map((tooth) => <td key={tooth} className="single"><select value={metric(chart, tooth, sites[0]).mobility} onChange={(event) => setMobility(tooth, Number(event.target.value))}>{[0, 1, 2, 3].map((grade) => <option key={grade}>{grade}</option>)}</select></td>)}</tr>
              <tr><th>Implant</th>{quadrant.teeth.map((tooth) => <td key={tooth} className="single"><button className={`implant-marker ${boolSummary([tooth], chart, "implant")[0] ? "active" : ""}`} onClick={() => sites.forEach((site) => setValue(tooth, site, "implant", !boolSummary([tooth], chart, "implant")[0]))} /></td>)}</tr>
              <BooleanRow label="Furcation" teeth={quadrant.teeth} sites={sites} field="furcation" color="dark" />
              <BooleanRow label="Bleeding on Probing" teeth={quadrant.teeth} sites={sites} field="bleeding" color="red" />
              <BooleanRow label="Plaque" teeth={quadrant.teeth} sites={sites} field="plaque" color="blue" />
              <NumericRow label="Gingival Margin" teeth={quadrant.teeth} sites={sites} field="gingivalMargin" min="-15" max="15" />
              <NumericRow label="Probing Depth" teeth={quadrant.teeth} sites={sites} field="probingDepth" min="0" max="15" />
            </tbody>
          </table>
        </div>
        <div className="perio2-graphic">
          <svg viewBox={`0 0 ${quadrant.teeth.length * 66} 180`} preserveAspectRatio="none">
            {Array.from({ length: 13 }, (_, index) => <line key={index} x1="0" x2={quadrant.teeth.length * 66} y1={24 + index * 9} y2={24 + index * 9} className="perio2-gridline" />)}
            {quadrant.teeth.map((tooth, index) => <g key={tooth} transform={`translate(${index * 66 + 13} 76)`}>
              <path className="perio2-root" d="M15 56 C3 35 6 13 20 0 C33 13 36 35 24 56" />
              <path className="perio2-crown" d="M4 15 C4 1 36 1 36 15 L32 54 C24 64 16 64 8 54 Z" />
              <text x="20" y="76">{tooth}</text>
            </g>)}
            <path className="perio2-margin-line" d={pathFor(quadrant.teeth, chart, sites, "gingivalMargin", 5, 96)} />
            <path className="perio2-depth-line" d={pathFor(quadrant.teeth, chart, sites, "probingDepth", 6, 118)} />
            {quadrant.teeth.flatMap((tooth, toothIndex) => sites.map((site, siteIndex) => {
              const measurement = metric(chart, tooth, site);
              if (!measurement.suppuration) return null;
              return <circle key={`${tooth}-${site}`} cx={toothIndex * 66 + siteIndex * 19 + 17} cy="96" r="7" className="perio2-pus" />;
            }))}
          </svg>
        </div>
      </section>
    );
  }

  const selectedPatient = patients.find((item) => String(item.id) === patientId);

  return (
    <>
      <section className="hero odontogram-hero">
        <div><p className="eyebrow">Clinico odontologico</p><h1>{setMode ? "PERIODONTOGRAMA (3)" : "PERIODONTOGRAMA (2)"}</h1><p className="hero-copy">{setMode ? "Vista por set periodontal para registrar buccal superior, lingual inferior o revisar todo el esquema en una sola pantalla." : "Vista grafica periodontal con curvas de margen y sondaje, similar al formato clinico tradicional."}</p></div>
        <button className="button primary large" disabled={!patientId || saving} onClick={save}><Icon name="check" /> {saving ? "Guardando..." : "Guardar evaluacion"}</button>
      </section>

      <section className="stats periodontal-stats">
        <article><div className="stat-icon gold"><Icon name="activity" /></div><div><small>Bolsas ≥ 4 mm</small><strong>{summary.pockets}</strong><p>{summary.severe} sitios ≥ 6 mm</p></div></article>
        <article><div className="stat-icon purple"><Icon name="shield" /></div><div><small>Sangrado / supuracion</small><strong>{summary.bleeding}/{summary.suppuration}</strong><p>Inflamacion activa</p></div></article>
        <article><div className="stat-icon teal"><Icon name="tooth" /></div><div><small>Placa registrada</small><strong>{summary.plaque}</strong><p>Sitios marcados</p></div></article>
        <article><div className="stat-icon green"><Icon name="database" /></div><div><small>Ultima version</small><strong>{record ? `#${record.id}` : "Nueva"}</strong><p>{record?.recordedAt || "Sin guardar"}</p></div></article>
      </section>

      <section className="schedule-panel perio2-patient-card">
        <label className="schedule-select"><span>Paciente</span><select value={patientId} onChange={(event) => setPatientId(event.target.value)}>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.nombres} {patient.apellidoPaterno} · {patient.rut}</option>)}</select></label>
        {selectedPatient && <div className="selected-professional"><span className="patient-avatar">{selectedPatient.nombres[0]}{selectedPatient.apellidoPaterno[0]}</span><div><strong>{selectedPatient.nombres} {selectedPatient.apellidoPaterno}</strong><small>{selectedPatient.correo}</small></div></div>}
        {loading && <span className="pending-tag">Cargando ficha...</span>}
      </section>

      {setMode && (
        <section className="content-card perio3-set-picker">
          <div className="card-heading">
            <div>
              <h2>Seleccion del set periodontal</h2>
              <p>{activeSet.description}. El guardado conserva la ficha completa del paciente.</p>
            </div>
          </div>
          <div className="perio3-set-options">
            {periodontalSets.map((option) => (
              <button key={option.id} className={selectedSet === option.id ? "selected" : ""} onClick={() => setSelectedSet(option.id)}>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="perio2-sheet">
        {visibleBands.map((band) => <ToothBand key={`${band.quadrantIndex}-${band.surface}`} quadrant={quadrants[band.quadrantIndex]} surface={band.surface} />)}
      </section>

      <section className="content-card">
        <div className="card-heading"><div><h2>Diagnostico, planificacion y seguimiento</h2><p>Texto clinico asociado a esta version grafica.</p></div></div>
        <div className="periodontal-notes perio2-notes">
          <label className="field field-wide"><span>Diagnostico</span><textarea maxLength="2000" value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} /></label>
          <label className="field field-wide"><span>Planificacion</span><textarea maxLength="2000" value={planning} onChange={(event) => setPlanning(event.target.value)} /></label>
          <label className="field field-wide"><span>Seguimiento</span><textarea maxLength="2000" value={followUp} onChange={(event) => setFollowUp(event.target.value)} /></label>
        </div>
      </section>
    </>
  );
}
