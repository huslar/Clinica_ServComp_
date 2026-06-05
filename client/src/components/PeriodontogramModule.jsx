import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icons";
import { patientService } from "../services/patientService";
import { periodontogramService } from "../services/periodontogramService";

const upperRight = ["18", "17", "16", "15", "14", "13", "12", "11"];
const upperLeft = ["21", "22", "23", "24", "25", "26", "27", "28"];
const lowerLeft = ["38", "37", "36", "35", "34", "33", "32", "31"];
const lowerRight = ["41", "42", "43", "44", "45", "46", "47", "48"];
const allTeeth = [...upperRight, ...upperLeft, ...lowerLeft, ...lowerRight];
const sites = [
  { id: "MV", label: "Mesio vestibular" },
  { id: "V", label: "Vestibular" },
  { id: "DV", label: "Disto vestibular" },
  { id: "MP", label: "Mesio palatino/lingual" },
  { id: "P", label: "Palatino/lingual" },
  { id: "DP", label: "Disto palatino/lingual" },
];

function defaultMeasurement(tooth, site) {
  return { tooth, site, probingDepth: 2, gingivalMargin: 0, bleeding: false, suppuration: false, mobility: 0 };
}

function makeInitialChart() {
  return Object.fromEntries(allTeeth.flatMap((tooth) => sites.map((site) => [`${tooth}-${site.id}`, defaultMeasurement(tooth, site.id)])));
}

function metricClass(measurement) {
  if (measurement.suppuration || measurement.probingDepth >= 6 || measurement.mobility >= 2) return "severe";
  if (measurement.bleeding || measurement.probingDepth >= 4 || Math.abs(measurement.gingivalMargin) >= 3 || measurement.mobility === 1) return "warning";
  return "stable";
}

function toothStatus(measurements) {
  if (measurements.some((item) => item.suppuration || item.probingDepth >= 6 || item.mobility >= 2)) return "severe";
  if (measurements.some((item) => item.bleeding || item.probingDepth >= 4 || Math.abs(item.gingivalMargin) >= 3 || item.mobility === 1)) return "warning";
  return "stable";
}

export function PeriodontogramModule({ onNotify }) {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [selectedTooth, setSelectedTooth] = useState("11");
  const [chart, setChart] = useState(makeInitialChart);
  const [record, setRecord] = useState(null);
  const [history, setHistory] = useState([]);
  const [diagnosis, setDiagnosis] = useState("");
  const [planning, setPlanning] = useState("");
  const [followUp, setFollowUp] = useState("");
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
            mobility: Number(item.mobility),
          };
        });
        setChart(next);
        setRecord(data.record);
        setHistory(data.history || []);
        setDiagnosis(data.record?.diagnosis || "");
        setPlanning(data.record?.planning || "");
        setFollowUp(data.record?.followUp || "");
      })
      .catch((error) => onNotify(error.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  const summary = useMemo(() => {
    const measurements = Object.values(chart);
    const pockets = measurements.filter((item) => item.probingDepth >= 4).length;
    const severePockets = measurements.filter((item) => item.probingDepth >= 6).length;
    const bleeding = measurements.filter((item) => item.bleeding).length;
    const suppuration = measurements.filter((item) => item.suppuration).length;
    const mobility = new Set(measurements.filter((item) => item.mobility >= 1).map((item) => item.tooth)).size;
    const risk = suppuration || severePockets || mobility ? "Alto" : pockets || bleeding ? "Moderado" : "Bajo";
    return { pockets, severePockets, bleeding, suppuration, mobility, risk };
  }, [chart]);

  const selectedMeasurements = sites.map((site) => chart[`${selectedTooth}-${site.id}`]);
  const selectedPatient = patients.find((item) => String(item.id) === patientId);

  function updateSite(site, field, value) {
    setChart((current) => ({
      ...current,
      [`${selectedTooth}-${site}`]: {
        ...current[`${selectedTooth}-${site}`],
        [field]: value,
      },
    }));
  }

  function updateMobility(value) {
    setChart((current) => {
      const next = { ...current };
      sites.forEach((site) => {
        next[`${selectedTooth}-${site.id}`] = { ...next[`${selectedTooth}-${site.id}`], mobility: value };
      });
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const measurements = Object.values(chart);
      const saved = await periodontogramService.save(patientId, {
        diagnosis,
        planning,
        followUp,
        measurements,
      });
      setRecord(saved.record);
      setHistory(saved.history || []);
      onNotify("Periodontograma guardado correctamente");
    } catch (error) {
      onNotify(error.message);
    } finally {
      setSaving(false);
    }
  }

  function ToothButton({ tooth }) {
    const measurements = sites.map((site) => chart[`${tooth}-${site.id}`]);
    const status = toothStatus(measurements);
    const pocketCount = measurements.filter((item) => item.probingDepth >= 4).length;
    return (
      <button className={`perio-tooth ${status} ${selectedTooth === tooth ? "selected" : ""}`} onClick={() => setSelectedTooth(tooth)}>
        <span>{tooth}</span>
        <i>{pocketCount || ""}</i>
      </button>
    );
  }

  return (
    <>
      <section className="hero odontogram-hero">
        <div>
          <p className="eyebrow">Clinico odontologico</p>
          <h1>PERIODONTOGRAMA</h1>
          <p className="hero-copy">Registro periodontal riguroso para diagnostico, planificacion y seguimiento clinico.</p>
        </div>
        <button className="button primary large" disabled={!patientId || saving} onClick={save}><Icon name="check" /> {saving ? "Guardando..." : "Guardar evaluacion"}</button>
      </section>

      <section className="stats periodontal-stats">
        <article><div className="stat-icon teal"><Icon name="tooth" /></div><div><small>Riesgo periodontal</small><strong>{summary.risk}</strong><p>Segun hallazgos ingresados</p></div></article>
        <article><div className="stat-icon gold"><Icon name="activity" /></div><div><small>Bolsas ≥ 4 mm</small><strong>{summary.pockets}</strong><p>{summary.severePockets} sitios ≥ 6 mm</p></div></article>
        <article><div className="stat-icon purple"><Icon name="shield" /></div><div><small>Sangrado / supuracion</small><strong>{summary.bleeding}/{summary.suppuration}</strong><p>Inflamacion e infeccion activa</p></div></article>
        <article><div className="stat-icon green"><Icon name="database" /></div><div><small>Piezas con movilidad</small><strong>{summary.mobility}</strong><p>Grado 1 a 3</p></div></article>
      </section>

      <section className="periodontal-layout">
        <aside className="schedule-panel perio-sidebar">
          <p className="eyebrow">Paciente</p>
          <h2>Evaluacion activa</h2>
          <label className="schedule-select"><span>Selecciona paciente</span><select value={patientId} onChange={(event) => setPatientId(event.target.value)}>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.nombres} {patient.apellidoPaterno} · {patient.rut}</option>)}</select></label>
          {selectedPatient && <div className="selected-professional"><span className="patient-avatar">{selectedPatient.nombres[0]}{selectedPatient.apellidoPaterno[0]}</span><div><strong>{selectedPatient.nombres} {selectedPatient.apellidoPaterno}</strong><small>{selectedPatient.correo}</small></div></div>}
          <div className="clinical-notice"><Icon name="shield" /><div><strong>Seguridad clínica</strong><p>Este módulo no guarda usuario/autorización todavía. El registro queda versionado por fecha para seguimiento posterior.</p></div></div>
          {record && <div className="perio-last-record"><small>Ultima evaluacion</small><strong>{record.recordedAt}</strong><span>{record.actor}</span></div>}
        </aside>

        <section className="schedule-board periodontal-board">
          <header><div><h2>Mapa periodontal</h2><p>Selecciona una pieza y registra seis sitios periodontales.</p></div>{loading && <span className="pending-tag">Cargando...</span>}</header>
          <div className="perio-chart">
            <div className="perio-arch"><small>Maxilar superior</small><div>{upperRight.map((tooth) => <ToothButton key={tooth} tooth={tooth} />)}<span className="perio-midline" />{upperLeft.map((tooth) => <ToothButton key={tooth} tooth={tooth} />)}</div></div>
            <div className="perio-arch"><small>Mandibula inferior</small><div>{lowerLeft.map((tooth) => <ToothButton key={tooth} tooth={tooth} />)}<span className="perio-midline" />{lowerRight.map((tooth) => <ToothButton key={tooth} tooth={tooth} />)}</div></div>
          </div>
        </section>
      </section>

      <section className="periodontal-detail-grid">
        <section className="content-card">
          <div className="card-heading"><div><h2>Pieza {selectedTooth}</h2><p>Profundidad, margen, sangrado, supuracion y movilidad.</p></div><span className={`perio-risk-tag ${toothStatus(selectedMeasurements)}`}>{toothStatus(selectedMeasurements)}</span></div>
          <div className="perio-site-table">
            <table>
              <thead><tr><th>Sitio</th><th>Sondaje mm</th><th>Margen mm</th><th>Sangrado</th><th>Supuracion</th></tr></thead>
              <tbody>{sites.map((site) => {
                const measurement = chart[`${selectedTooth}-${site.id}`];
                return <tr key={site.id} className={metricClass(measurement)}><td><strong>{site.id}</strong><small>{site.label}</small></td><td><input type="number" min="0" max="15" value={measurement.probingDepth} onChange={(event) => updateSite(site.id, "probingDepth", Number(event.target.value))} /></td><td><input type="number" min="-15" max="15" value={measurement.gingivalMargin} onChange={(event) => updateSite(site.id, "gingivalMargin", Number(event.target.value))} /></td><td><button className={measurement.bleeding ? "toggle-on" : ""} onClick={() => updateSite(site.id, "bleeding", !measurement.bleeding)}>{measurement.bleeding ? "Si" : "No"}</button></td><td><button className={measurement.suppuration ? "toggle-on danger" : ""} onClick={() => updateSite(site.id, "suppuration", !measurement.suppuration)}>{measurement.suppuration ? "Si" : "No"}</button></td></tr>;
              })}</tbody>
            </table>
          </div>
          <div className="mobility-control"><span>Movilidad dental</span>{[0, 1, 2, 3].map((grade) => <button key={grade} className={selectedMeasurements[0].mobility === grade ? "selected" : ""} onClick={() => updateMobility(grade)}>Grado {grade}</button>)}</div>
        </section>

        <section className="content-card">
          <div className="card-heading"><div><h2>Diagnostico y plan</h2><p>Texto clinico para planificacion y seguimiento.</p></div></div>
          <div className="periodontal-notes">
            <label className="field field-wide"><span>Diagnostico</span><textarea maxLength="2000" value={diagnosis} onChange={(event) => setDiagnosis(event.target.value)} placeholder="Ej. Periodontitis estadio..., bolsas periodontales localizadas..." /></label>
            <label className="field field-wide"><span>Planificacion</span><textarea maxLength="2000" value={planning} onChange={(event) => setPlanning(event.target.value)} placeholder="Ej. Destartraje, raspado y alisado radicular, reevaluacion..." /></label>
            <label className="field field-wide"><span>Seguimiento</span><textarea maxLength="2000" value={followUp} onChange={(event) => setFollowUp(event.target.value)} placeholder="Ej. Control periodontal en 30 dias..." /></label>
          </div>
          <div className="audit-list periodontal-history">{history.map((item) => <article key={item.id}><span className="audit-marker hallazgo_registrado" /><div><strong>Evaluacion #{item.id}</strong><small>{item.recordedAt} · {item.actor}</small></div></article>)}{!history.length && <p className="mini-empty">Sin evaluaciones previas.</p>}</div>
        </section>
      </section>
    </>
  );
}
