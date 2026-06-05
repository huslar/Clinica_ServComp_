import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icons";
import { patientService } from "../services/patientService";
import { odontogramService } from "../services/odontogramService";
import { initials } from "../utils/patient";
import { ToothFindingImage, toothFindingLegend } from "./ToothFindingImage";
import { ToothSurfaceImage, toothSurfaceLegend } from "./ToothSurfaceImage";

const permanentRows = [
  ["18", "17", "16", "15", "14", "13", "12", "11", "21", "22", "23", "24", "25", "26", "27", "28"],
  ["48", "47", "46", "45", "44", "43", "42", "41", "31", "32", "33", "34", "35", "36", "37", "38"],
];
const temporaryRows = [
  ["55", "54", "53", "52", "51", "61", "62", "63", "64", "65"],
  ["85", "84", "83", "82", "81", "71", "72", "73", "74", "75"],
];
const surfaces = [
  ["Completa", "Pieza completa"],
  ["Vestibular", "Vestibular"],
  ["LingualPalatina", "Lingual / palatina"],
  ["Mesial", "Mesial"],
  ["Distal", "Distal"],
  ["OclusalIncisal", "Oclusal / incisal"],
];
const findingTypes = ["Caries", "Restauracion", "Ausente", "Fractura", "Corona", "Endodoncia", "Implante", "Sellante", "Observacion"];
const severities = ["Leve", "Moderada", "Severa"];

function eventLabel(event) {
  if (event.eventType === "ODONTOGRAMA_CONSULTADO") return "Odontograma consultado";
  if (event.eventType === "PIEZA_SELECCIONADA") return `Pieza ${event.tooth} seleccionada`;
  if (event.eventType === "HALLAZGO_ANULADO") return `Hallazgo anulado · pieza ${event.tooth}`;
  return `${event.findingType} · pieza ${event.tooth} · ${event.surface}`;
}

function eventTime(value) {
  return new Intl.DateTimeFormat("es-CL", { dateStyle: "short", timeStyle: "short" }).format(new Date(value.replace(" ", "T")));
}

export function OdontogramModule({ onNotify, visualMode = false, surfaceMode = false, combinedMode = false }) {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState("");
  const [record, setRecord] = useState({ findings: [], history: [] });
  const [dentition, setDentition] = useState("Permanente");
  const [tooth, setTooth] = useState("11");
  const [surface, setSurface] = useState("Completa");
  const [findingType, setFindingType] = useState("Caries");
  const [severity, setSeverity] = useState("Leve");
  const [clinicalNote, setClinicalNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [chartView, setChartView] = useState("Ambas");

  useEffect(() => {
    patientService.list()
      .then((items) => {
        const activePatients = items.filter((item) => item.estado === "Activo");
        setPatients(activePatients);
        if (activePatients[0]) setPatientId(String(activePatients[0].id));
      })
      .catch((error) => onNotify(error.message));
  }, []);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    odontogramService.get(patientId)
      .then(setRecord)
      .catch((error) => onNotify(error.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  const selectedPatient = patients.find((item) => String(item.id) === patientId);
  const rows = dentition === "Permanente" ? permanentRows : temporaryRows;
  const findingsByTooth = useMemo(() => record.findings.reduce((result, finding) => {
    result[finding.tooth] = [...(result[finding.tooth] || []), finding];
    return result;
  }, {}), [record.findings]);
  const selectedFindings = findingsByTooth[tooth] || [];
  const showVisual = visualMode || (combinedMode && chartView !== "Superficies");
  const showSurface = surfaceMode || (combinedMode && chartView !== "Interactivo");

  function selectDentition(next) {
    setDentition(next);
    setTooth(next === "Permanente" ? "11" : "51");
  }

  function selectTooth(next) {
    setTooth(next);
    if (patientId) odontogramService.recordInteraction(patientId, dentition, next).catch(() => {});
  }

  async function saveFinding(event) {
    event.preventDefault();
    if (!patientId || !tooth) return;
    setSaving(true);
    try {
      const next = await odontogramService.createFinding(patientId, { dentition, tooth, surface, findingType, severity, clinicalNote });
      setRecord(next);
      setClinicalNote("");
      onNotify("Hallazgo clinico registrado correctamente");
    } catch (error) {
      onNotify(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function annul(finding) {
    const reason = window.prompt("Indica el motivo clinico de anulacion del hallazgo:");
    if (!reason) return;
    try {
      setRecord(await odontogramService.annulFinding(patientId, finding.id, reason));
      onNotify("Hallazgo anulado mediante evento compensatorio");
    } catch (error) {
      onNotify(error.message);
    }
  }

  function renderTooth(code, representation = "basic") {
    const findings = findingsByTooth[code] || [];
    const count = findings.length;
    const isSurface = representation === "surface";
    const isVisual = representation === "visual";
    return <button key={`${representation}-${code}`} className={`tooth ${isVisual || isSurface ? "tooth-visual" : ""} ${isSurface ? "tooth-surface" : ""} ${combinedMode ? `tooth-combined representation-${representation}` : ""} ${tooth === code ? "selected" : ""} ${count ? "has-finding" : ""}`} onClick={() => selectTooth(code)} aria-pressed={tooth === code}>{isSurface ? <ToothSurfaceImage compact findings={findings} label={`Pieza ${code} por superficies`} /> : isVisual ? <ToothFindingImage compact findings={findings} label={`Pieza ${code} interactiva`} /> : <span className="tooth-shape"><i /><i /><i /><i /><b /></span>}<strong>{code}</strong>{count > 0 && <em>{count}</em>}</button>;
  }

  return (
    <>
      <section className="hero odontogram-hero">
        <div><p className="eyebrow">Ficha clinica odontologica</p><h1>{combinedMode ? "ODONTOGRAMA DE HALLAZGOS (4)" : surfaceMode ? "ODONTOGRAMA DE HALLAZGOS (3)" : visualMode ? "ODONTOGRAMA DE HALLAZGOS (2)" : "ODONTOGRAMA DE HALLAZGOS"}</h1><p className="hero-copy">{combinedMode ? "Consulta el odontograma completo alternando la imagen clinica interactiva, el mapa de superficies o ambas representaciones en paralelo." : surfaceMode ? "Representa los hallazgos vigentes sobre las superficies vestibular, lingual o palatina, mesial, distal y oclusal o incisal de cada pieza." : visualMode ? "Visualiza cada pieza dental con representaciones graficas diferenciadas para los hallazgos vigentes, manteniendo la misma trazabilidad clinica." : "Registra hallazgos por pieza y superficie con trazabilidad clinica completa. Las correcciones quedan documentadas mediante anulaciones auditables."}</p></div>
      </section>

      <section className="odontogram-layout">
        <aside className="odontogram-sidebar">
          <section className="schedule-panel">
            <p className="eyebrow">Paciente</p><h2>Ficha seleccionada</h2>
            <label className="schedule-select"><span>Selecciona paciente</span><select value={patientId} onChange={(event) => setPatientId(event.target.value)}>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.nombres} {patient.apellidoPaterno} · {patient.rut}</option>)}</select></label>
            {selectedPatient && <div className="selected-professional"><span className="patient-avatar">{initials(selectedPatient)}</span><div><strong>{selectedPatient.nombres} {selectedPatient.apellidoPaterno} {selectedPatient.apellidoMaterno}</strong><small>{selectedPatient.rut} · Ficha #{selectedPatient.id}</small></div></div>}
          </section>
          <section className="schedule-summary odontogram-summary"><div><small>Hallazgos vigentes</small><strong>{record.findings.length}</strong></div><div><small>Eventos auditados</small><strong>{record.history.length}</strong></div></section>
          <section className="schedule-panel clinical-notice"><Icon name="shield" /><div><strong>Registro clinico inmutable</strong><p>Las correcciones no eliminan datos: generan un evento de anulacion trazable.</p></div></section>
        </aside>

        <section className="odontogram-main">
          <section className="content-card odontogram-board">
            <header className="odontogram-board-header"><div><h2>{combinedMode ? "Odontograma visual consolidado" : surfaceMode ? "Odontograma visual por superficies" : visualMode ? "Odontograma visual interactivo" : "Odontograma interactivo"}</h2><p>Selecciona una pieza dental y registra el hallazgo clinico en la superficie correspondiente.</p></div><div className="odontogram-board-controls">{combinedMode && <div className="chart-view-switch">{["Ambas", "Superficies", "Interactivo"].map((item) => <button key={item} className={chartView === item ? "selected" : ""} onClick={() => setChartView(item)}>{item}</button>)}</div>}<div className="dentition-switch">{["Permanente", "Temporal"].map((item) => <button key={item} className={dentition === item ? "selected" : ""} onClick={() => selectDentition(item)}>{item}</button>)}</div></div></header>
            {loading ? <div className="schedule-loading">Cargando ficha odontologica...</div> : <div className="odontogram-chart">
              {rows.map((row, index) => <div className="tooth-row" key={`${dentition}-${index}`}>
                <span className="arch-label">{index === 0 ? "Superior" : "Inferior"}</span>
                {combinedMode ? <div className="combined-arch-grids">
                  {showVisual && <div><small>Interactivo</small><div className="tooth-row-grid">{row.map((code) => renderTooth(code, "visual"))}</div></div>}
                  {showSurface && <div><small>Superficies</small><div className="tooth-row-grid">{row.map((code) => renderTooth(code, "surface"))}</div></div>}
                </div> : <div className="tooth-row-grid">{row.map((code) => renderTooth(code, surfaceMode ? "surface" : visualMode ? "visual" : "basic"))}</div>}
              </div>)}
            </div>}
          </section>

          {visualMode && <section className="content-card odontogram-visual-guide">
            <div className="visual-selected-tooth"><ToothFindingImage findings={selectedFindings} label={`Pieza ${tooth}`} /><div><p className="eyebrow">Vista ampliada</p><h2>Pieza {tooth}</h2><p>{selectedFindings.length ? `${selectedFindings.length} hallazgo(s) vigente(s) representado(s) en la imagen.` : "Sin hallazgos vigentes registrados para esta pieza."}</p></div></div>
            <div className="finding-image-legend">{toothFindingLegend.map(([type, label]) => <div key={type}><ToothFindingImage compact findings={[{ findingType: type }]} label={label} /><span>{label}</span></div>)}</div>
          </section>}

          {surfaceMode && <section className="content-card odontogram-surface-guide">
            <div className="surface-selected-tooth"><ToothSurfaceImage findings={selectedFindings} label={`Pieza ${tooth}`} /><div><p className="eyebrow">Mapa de superficies</p><h2>Pieza {tooth}</h2><p>{selectedFindings.length ? `${selectedFindings.length} hallazgo(s) vigente(s) distribuido(s) sobre la pieza.` : "Sin hallazgos vigentes registrados para esta pieza."}</p></div></div>
            <div className="surface-image-legend">{toothSurfaceLegend.map(([surfaceName, label]) => <div key={surfaceName}><span className={`surface-legend-shape ${surfaceName.toLowerCase()}`} /><strong>{label}</strong></div>)}</div>
          </section>}

          {combinedMode && <section className="content-card odontogram-combined-guide">
            {showVisual && <div className="combined-guide-row"><div className="combined-guide-block visual-selected-tooth"><ToothFindingImage findings={selectedFindings} label={`Pieza ${tooth} interactiva`} /><div><p className="eyebrow">Vista ampliada</p><h2>Pieza {tooth}</h2><p>{selectedFindings.length ? `${selectedFindings.length} hallazgo(s) vigente(s) representado(s) en la imagen.` : "Sin hallazgos vigentes registrados para esta pieza."}</p></div></div><div className="finding-image-legend">{toothFindingLegend.map(([type, label]) => <div key={type}><ToothFindingImage compact findings={[{ findingType: type }]} label={label} /><span>{label}</span></div>)}</div></div>}
            {showSurface && <div className="combined-guide-row"><div className="combined-guide-block surface-selected-tooth"><ToothSurfaceImage findings={selectedFindings} label={`Pieza ${tooth} por superficies`} /><div><p className="eyebrow">Mapa de superficies</p><h2>Pieza {tooth}</h2><p>{selectedFindings.length ? `${selectedFindings.length} hallazgo(s) vigente(s) distribuido(s) sobre la pieza.` : "Sin hallazgos vigentes registrados para esta pieza."}</p></div></div><div className="surface-image-legend">{toothSurfaceLegend.map(([surfaceName, label]) => <div key={surfaceName}><span className={`surface-legend-shape ${surfaceName.toLowerCase()}`} /><strong>{label}</strong></div>)}</div></div>}
          </section>}

          <section className="odontogram-detail-grid">
            <form className="content-card finding-form" onSubmit={saveFinding}>
              <div className="card-heading"><div><h2>Nuevo hallazgo · pieza {tooth}</h2><p>Completa la informacion clinica antes de registrar.</p></div></div>
              <div className="finding-form-body">
                <label className="field field-wide">Superficie<div className="surface-picker">{surfaces.map(([value, label]) => <button type="button" key={value} className={surface === value ? "selected" : ""} onClick={() => setSurface(value)}>{label}</button>)}</div></label>
                <div className="field-grid">
                  <label className="field">Hallazgo<select value={findingType} onChange={(event) => setFindingType(event.target.value)}>{findingTypes.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label className="field">Severidad<select value={severity} onChange={(event) => setSeverity(event.target.value)}>{severities.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label className="field field-wide">Nota clinica<textarea value={clinicalNote} maxLength={500} onChange={(event) => setClinicalNote(event.target.value)} placeholder="Describe el hallazgo observado, antecedentes relevantes o criterio clinico..." /><small className="character-count">{clinicalNote.length}/500</small></label>
                </div>
                <button className="button primary large" disabled={!patientId || saving}><Icon name="plus" />{saving ? "Registrando..." : "Registrar hallazgo"}</button>
              </div>
            </form>

            <section className="content-card tooth-findings">
              <div className="card-heading"><div><h2>Hallazgos vigentes · {tooth}</h2><p>Estado clinico activo de la pieza seleccionada.</p></div></div>
              <div className="finding-list">{selectedFindings.map((finding) => <article key={finding.id}><span className={`finding-dot ${finding.findingType.toLowerCase()}`} /><div><strong>{finding.findingType} · {finding.surface}</strong><small>{finding.severity} · {eventTime(finding.occurredAt)} · {finding.actor}</small>{finding.clinicalNote && <p>{finding.clinicalNote}</p>}</div><button onClick={() => annul(finding)} title="Anular hallazgo" aria-label="Anular hallazgo"><Icon name="close" size={15} /></button></article>)}{!selectedFindings.length && <div className="mini-empty">No hay hallazgos vigentes para esta pieza.</div>}</div>
            </section>
          </section>

          <section className="content-card audit-timeline">
            <div className="card-heading"><div><h2>Trazabilidad del odontograma</h2><p>Ultimos eventos registrados para la ficha seleccionada.</p></div><span className="audit-tag"><Icon name="shield" size={14} />Auditoria activa</span></div>
            <div className="audit-list">{record.history.map((event) => <article key={event.id}><span className={`audit-marker ${event.eventType.toLowerCase()}`} /><div><strong>{eventLabel(event)}</strong><small>{eventTime(event.occurredAt)} · {event.actor} · solicitud {event.requestId.slice(0, 8)}</small>{event.clinicalNote && <p>{event.clinicalNote}</p>}</div></article>)}</div>
          </section>
        </section>
      </section>
    </>
  );
}
