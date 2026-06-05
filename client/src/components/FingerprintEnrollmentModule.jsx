import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icons";
import { fingerprintReaderService, fingerprintService } from "../services/fingerprintService";
import { initials } from "../utils/patient";

export function FingerprintEnrollmentModule({ onNotify }) {
  const [professionals, setProfessionals] = useState([]);
  const [professionalId, setProfessionalId] = useState("");
  const [reader, setReader] = useState({ checking: true, connected: false });
  const [capturing, setCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState();

  useEffect(() => {
    fingerprintService.list()
      .then((items) => {
        setProfessionals(items);
        if (items[0]) setProfessionalId(String(items[0].professionalId));
      })
      .catch((error) => onNotify(error.message));
    checkReader();
  }, []);

  const selected = useMemo(() => professionals.find((item) => String(item.professionalId) === professionalId), [professionals, professionalId]);
  const enrolledCount = professionals.filter((item) => item.enrolled).length;

  useEffect(() => {
    if (!capturing) return undefined;
    const updateStatus = () => fingerprintReaderService.status().then(setCaptureStatus).catch(() => {});
    updateStatus();
    const timer = setInterval(updateStatus, 500);
    return () => clearInterval(timer);
  }, [capturing]);

  async function checkReader() {
    setReader({ checking: true, connected: false });
    try {
      const status = await fingerprintReaderService.health();
      setReader({ checking: false, connected: true, device: status.device || "U.are.U 4500" });
    } catch {
      setReader({ checking: false, connected: false });
    }
  }

  async function enroll() {
    if (!selected) return;
    if (selected.enrolled) return onNotify("El profesional ya posee una huella enrolada");
    setCaptureStatus({ active: true, message: "Iniciando captura...", samplesCaptured: 0, samplesRequired: 4 });
    setCapturing(true);
    try {
      const capture = await fingerprintReaderService.capture();
      const updated = await fingerprintService.enroll(selected.professionalId, capture);
      setProfessionals((current) => current.map((item) => item.professionalId === updated.professionalId ? updated : item));
      onNotify("Huella enrolada correctamente");
    } catch (error) {
      onNotify(error.message);
    } finally {
      setCapturing(false);
    }
  }

  return (
    <>
      <section className="hero">
        <div><p className="eyebrow">Control biometrico</p><h1>ENROLAMIENTO DE HUELLA</h1><p className="hero-copy">Registra la huella del profesional mediante el lector U.are.U 4500. La captura se procesa como plantilla biometrica y se almacena cifrada.</p></div>
      </section>

      <section className="stats fingerprint-stats">
        <article><div className="stat-icon teal"><Icon name="fingerprint" /></div><div><small>Profesionales activos</small><strong>{professionals.length}</strong><p>Disponibles para enrolamiento</p></div></article>
        <article><div className="stat-icon green"><Icon name="check" /></div><div><small>Huellas enroladas</small><strong>{enrolledCount}</strong><p>Plantillas protegidas</p></div></article>
        <article><div className={`stat-icon ${reader.connected ? "green" : "gold"}`}><Icon name="activity" /></div><div><small>Estado del lector</small><strong className="reader-stat">{reader.checking ? "Verificando" : reader.connected ? "Conectado" : "Sin conexion"}</strong><p>{reader.device || "U.are.U 4500"}</p></div></article>
      </section>

      <section className="fingerprint-layout">
        <section className="content-card fingerprint-card">
          <div className="card-heading"><div><h2>Seleccionar profesional</h2><p>El enrolamiento solo se habilita para profesionales activos.</p></div></div>
          <div className="fingerprint-form">
            <label className="schedule-select"><span>Profesional</span><select value={professionalId} onChange={(event) => setProfessionalId(event.target.value)}>{professionals.map((professional) => <option key={professional.professionalId} value={professional.professionalId}>{professional.nombres} {professional.apellidoPaterno} {professional.apellidoMaterno}</option>)}</select></label>
            {selected && <div className="fingerprint-professional"><span className="patient-avatar">{initials(selected)}</span><div><strong>{selected.nombres} {selected.apellidoPaterno}</strong><small>{selected.rut} · {selected.profesion} · {selected.areaTrabajo}</small></div><span className={`badge ${selected.enrolled ? "activo" : "inactivo"}`}><i />{selected.enrolled ? "Huella enrolada" : "Sin enrolar"}</span></div>}
          </div>
        </section>

        <aside className="content-card reader-card">
          <div className={`fingerprint-visual ${capturing ? "capturing" : ""}`}>{captureStatus?.previewImage ? <img src={captureStatus.previewImage} alt="Vista previa de la huella capturada" /> : <Icon name="fingerprint" size={62} />}</div>
          <h2>Lector U.are.U 4500</h2>
          <p>{reader.connected ? "Lector disponible. Solicita al profesional apoyar el dedo hasta completar la captura." : "No se detecta el agente local del lector. Inicia el servicio y vuelve a verificar."}</p>
          <div className={`reader-status ${reader.connected ? "connected" : "disconnected"}`}><i />{reader.checking ? "Verificando conexion..." : reader.connected ? "Lector conectado" : "Lector no disponible"}</div>
          {capturing && <div className="capture-progress"><strong>{captureStatus?.message || "Apoya el dedo sobre el lector"}</strong><span>{captureStatus?.samplesCaptured || 0} de {captureStatus?.samplesRequired || 4} muestras aceptadas</span><div><i style={{ width: `${(captureStatus?.samplesCaptured || 0) * 25}%` }} /></div></div>}
          <button className="button secondary" disabled={reader.checking || capturing} onClick={checkReader}>Verificar lector</button>
          <button className="button primary large" disabled={!selected || selected.enrolled || !reader.connected || capturing} onClick={enroll}><Icon name="fingerprint" />{capturing ? "Capturando huella..." : selected?.enrolled ? "Huella ya enrolada" : "Enrolar huella"}</button>
        </aside>
      </section>
    </>
  );
}
