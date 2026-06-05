import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";
import { patientService } from "../services/patientService";
import { emptyPatient, formatRut, isValidRut, validatePatient } from "../utils/patient";

const communes = ["La Reina", "Las Condes", "Nunoa", "Providencia", "Santiago", "Vitacura"];

function Field({ label, error, children, wide = false }) {
  return (
    <label className={`field ${wide ? "field-wide" : ""}`}>
      <span>{label}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}

export function PatientForm({ patient, onClose, onSave }) {
  const [form, setForm] = useState(emptyPatient);
  const [errors, setErrors] = useState({});
  const [rutLookup, setRutLookup] = useState("");
  const rutLookupRequest = useRef(0);

  useEffect(() => {
    setForm(patient ? { ...patient } : emptyPatient);
    setErrors({});
    setRutLookup("");
  }, [patient]);

  useEffect(() => {
    if (!isValidRut(form.rut)) return undefined;
    const timer = setTimeout(() => lookupRut(form.rut), 450);
    return () => clearTimeout(timer);
  }, [form.rut]);

  function change(field, value) {
    if (field === "rut") rutLookupRequest.current += 1;
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function lookupRut(rut = form.rut) {
    if (!isValidRut(rut)) return;
    const requestId = ++rutLookupRequest.current;
    setRutLookup("Buscando paciente...");
    try {
      const existing = await patientService.findByRut(rut);
      if (requestId !== rutLookupRequest.current) return;
      setForm(existing);
      setErrors({});
      setRutLookup("Paciente existente: se cargaron sus datos para evitar un registro duplicado.");
    } catch (error) {
      if (requestId !== rutLookupRequest.current) return;
      setRutLookup(error.message === "Paciente no encontrado" ? "RUT disponible para un nuevo registro." : "No fue posible verificar el RUT.");
    }
  }

  function submit(event) {
    event.preventDefault();
    const nextErrors = validatePatient(form);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    onSave(form);
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={patient ? "Editar paciente" : "Nuevo paciente"} onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header">
          <div>
            <p className="eyebrow">{form.id ? `Ficha #${form.id}` : "Nueva ficha clinica"}</p>
            <h2>{form.id ? "Editar paciente" : "Registrar paciente"}</h2>
            <p>Completa la informacion personal y de contacto.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button>
        </header>

        <form onSubmit={submit}>
          <section className="form-section">
            <div className="section-heading">
              <span>01</span>
              <div><h3>Identificacion</h3><p>Datos principales del paciente</p></div>
            </div>
            <div className="field-grid">
              <Field label="RUT" error={errors.rut}>
                <input value={form.rut} readOnly={Boolean(form.id)} title={form.id ? "El RUT no se puede modificar en una ficha existente" : undefined} onChange={(event) => { change("rut", formatRut(event.target.value)); setRutLookup(""); }} placeholder="12.345.678-5" />
                {rutLookup && <em className={`lookup-note ${form.id ? "found" : ""}`}>{rutLookup}</em>}
              </Field>
              <Field label="Nombres" error={errors.nombres}>
                <input value={form.nombres} onChange={(event) => change("nombres", event.target.value)} placeholder="Ej. Maria Jose" />
              </Field>
              <Field label="Apellido paterno" error={errors.apellidoPaterno}>
                <input value={form.apellidoPaterno} onChange={(event) => change("apellidoPaterno", event.target.value)} placeholder="Apellido paterno" />
              </Field>
              <Field label="Apellido materno" error={errors.apellidoMaterno}>
                <input value={form.apellidoMaterno} onChange={(event) => change("apellidoMaterno", event.target.value)} placeholder="Apellido materno" />
              </Field>
              <Field label="Fecha de nacimiento" error={errors.fechaNacimiento}>
                <input type="date" value={form.fechaNacimiento || ""} max={new Date().toISOString().slice(0, 10)} onChange={(event) => change("fechaNacimiento", event.target.value)} />
              </Field>
              <Field label="Estado civil" error={errors.estadoCivil}>
                <select value={form.estadoCivil || ""} onChange={(event) => change("estadoCivil", event.target.value)}>
                  <option value="">Selecciona una opcion</option>
                  <option>Soltero/a</option>
                  <option>Casado/a</option>
                  <option>Divorciado/a</option>
                  <option>Viudo/a</option>
                  <option>Conviviente civil</option>
                </select>
              </Field>
              <Field label="Genero" error={errors.genero}>
                <select value={form.genero || ""} onChange={(event) => change("genero", event.target.value)}>
                  <option value="">Selecciona una opcion</option>
                  <option>Femenino</option>
                  <option>Masculino</option>
                  <option>No binario</option>
                  <option>Prefiere no informar</option>
                </select>
              </Field>
            </div>
          </section>

          <section className="form-section">
            <div className="section-heading">
              <span>02</span>
              <div><h3>Contacto</h3><p>Informacion para comunicacion</p></div>
            </div>
            <div className="field-grid">
              <Field label="Direccion" error={errors.direccion} wide>
                <input value={form.direccion} onChange={(event) => change("direccion", event.target.value)} placeholder="Calle, numero, depto." />
              </Field>
              <Field label="Comuna" error={errors.comuna}>
                <input list="communes" value={form.comuna} onChange={(event) => change("comuna", event.target.value)} placeholder="Selecciona comuna" />
                <datalist id="communes">{communes.map((commune) => <option key={commune}>{commune}</option>)}</datalist>
              </Field>
              <Field label="Movil" error={errors.movil}>
                <input value={form.movil} onChange={(event) => change("movil", event.target.value)} placeholder="+56 9 1234 5678" />
              </Field>
              <Field label="Correo electronico" error={errors.correo} wide>
                <input type="email" value={form.correo} onChange={(event) => change("correo", event.target.value)} placeholder="nombre@email.cl" />
              </Field>
            </div>
          </section>

          <section className="form-section">
            <div className="section-heading">
              <span>03</span>
              <div><h3>Informacion adicional</h3><p>Antecedentes administrativos</p></div>
            </div>
            <div className="field-grid">
              <Field label="Profesion" error={errors.profesion}>
                <input value={form.profesion} onChange={(event) => change("profesion", event.target.value)} placeholder="Ej. Ingeniera" />
              </Field>
              <Field label="Estado">
                <select value={form.estado} onChange={(event) => change("estado", event.target.value)}>
                  <option>Activo</option>
                  <option>Inactivo</option>
                </select>
              </Field>
            </div>
          </section>

          <footer className="drawer-footer">
            <button type="button" className="button secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="button primary"><Icon name="check" /> {form.id ? "Guardar cambios" : "Registrar paciente"}</button>
          </footer>
        </form>
      </aside>
    </div>
  );
}
