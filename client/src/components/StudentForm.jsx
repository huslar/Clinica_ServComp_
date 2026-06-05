import React, { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";
import { studentService } from "../services/studentService";
import { emptyStudent, validateStudent } from "../utils/student";
import { formatRut, isValidRut } from "../utils/patient";

const communes = ["Chiguayante", "La Reina", "Las Condes", "Nunoa", "Providencia", "Santiago", "Vitacura"];
const categories = ["Practica curricular", "Practica profesional", "Internado", "Pasantia", "Tesista"];

function Field({ label, error, children, wide = false }) {
  return <label className={`field ${wide ? "field-wide" : ""}`}><span>{label}</span>{children}{error && <small>{error}</small>}</label>;
}

export function StudentForm({ student, onClose, onSave }) {
  const [form, setForm] = useState(emptyStudent);
  const [errors, setErrors] = useState({});
  const [rutLookup, setRutLookup] = useState("");
  const rutLookupRequest = useRef(0);

  useEffect(() => {
    setForm(student ? { ...student } : emptyStudent);
    setErrors({});
    setRutLookup("");
  }, [student]);

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

  async function lookupRut(rut) {
    const requestId = ++rutLookupRequest.current;
    setRutLookup("Buscando alumno...");
    try {
      const existing = await studentService.findByRut(rut);
      if (requestId !== rutLookupRequest.current) return;
      setForm(existing);
      setErrors({});
      setRutLookup("Alumno existente: se cargaron sus datos para evitar duplicados.");
    } catch (error) {
      if (requestId !== rutLookupRequest.current) return;
      setRutLookup(error.message === "Alumno no encontrado" ? "RUT disponible para un nuevo registro." : "No fue posible verificar el RUT.");
    }
  }

  function submit(event) {
    event.preventDefault();
    const nextErrors = validateStudent(form);
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);
    return onSave(form);
  }

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={form.id ? "Editar alumno" : "Nuevo alumno"} onMouseDown={(event) => event.stopPropagation()}>
        <header className="drawer-header"><div><p className="eyebrow">{form.id ? `Ficha alumno #${form.id}` : "Nueva ficha de alumno"}</p><h2>{form.id ? "Editar alumno" : "Registrar alumno"}</h2><p>Completa la informacion personal y academica.</p></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><Icon name="close" /></button></header>
        <form onSubmit={submit}>
          <section className="form-section">
            <div className="section-heading"><span>01</span><div><h3>Identificacion</h3><p>Datos principales del alumno</p></div></div>
            <div className="field-grid">
              <Field label="RUT" error={errors.rut}><input value={form.rut} readOnly={Boolean(form.id)} title={form.id ? "El RUT no se puede modificar" : undefined} onChange={(event) => { change("rut", formatRut(event.target.value)); setRutLookup(""); }} placeholder="12.345.678-5" />{rutLookup && <em className={`lookup-note ${form.id ? "found" : ""}`}>{rutLookup}</em>}</Field>
              <Field label="Nombres" error={errors.nombres}><input value={form.nombres} onChange={(event) => change("nombres", event.target.value)} placeholder="Ej. Maria Jose" /></Field>
              <Field label="Apellido paterno" error={errors.apellidoPaterno}><input value={form.apellidoPaterno} onChange={(event) => change("apellidoPaterno", event.target.value)} placeholder="Apellido paterno" /></Field>
              <Field label="Apellido materno" error={errors.apellidoMaterno}><input value={form.apellidoMaterno} onChange={(event) => change("apellidoMaterno", event.target.value)} placeholder="Apellido materno" /></Field>
              <Field label="Fecha de nacimiento" error={errors.fechaNacimiento}><input type="date" value={form.fechaNacimiento || ""} max={new Date().toISOString().slice(0, 10)} onChange={(event) => change("fechaNacimiento", event.target.value)} /></Field>
              <Field label="Estado civil" error={errors.estadoCivil}><select value={form.estadoCivil} onChange={(event) => change("estadoCivil", event.target.value)}><option value="">Selecciona una opcion</option><option>Soltero/a</option><option>Casado/a</option><option>Divorciado/a</option><option>Viudo/a</option><option>Conviviente civil</option></select></Field>
              <Field label="Genero" error={errors.genero}><select value={form.genero} onChange={(event) => change("genero", event.target.value)}><option value="">Selecciona una opcion</option><option>Femenino</option><option>Masculino</option><option>No binario</option><option>Prefiere no informar</option></select></Field>
            </div>
          </section>
          <section className="form-section">
            <div className="section-heading"><span>02</span><div><h3>Contacto</h3><p>Informacion para comunicacion</p></div></div>
            <div className="field-grid">
              <Field label="Direccion" error={errors.direccion} wide><input value={form.direccion} onChange={(event) => change("direccion", event.target.value)} placeholder="Calle, numero, depto." /></Field>
              <Field label="Comuna" error={errors.comuna}><input list="student-communes" value={form.comuna} onChange={(event) => change("comuna", event.target.value)} placeholder="Selecciona comuna" /><datalist id="student-communes">{communes.map((commune) => <option key={commune}>{commune}</option>)}</datalist></Field>
              <Field label="Movil" error={errors.movil}><input value={form.movil} onChange={(event) => change("movil", event.target.value)} placeholder="+56 9 1234 5678" /></Field>
              <Field label="Correo electronico" error={errors.correo} wide><input type="email" value={form.correo} onChange={(event) => change("correo", event.target.value)} placeholder="nombre@alumnos.cl" /></Field>
            </div>
          </section>
          <section className="form-section">
            <div className="section-heading"><span>03</span><div><h3>Informacion carrera</h3><p>Antecedentes academicos del alumno</p></div></div>
            <div className="field-grid">
              <Field label="Carrera o especialidad" error={errors.carreraEspecialidad}><input value={form.carreraEspecialidad} onChange={(event) => change("carreraEspecialidad", event.target.value)} placeholder="Ej. Enfermeria" /></Field>
              <Field label="Año que cursa" error={errors.anioCursa}><select value={form.anioCursa} onChange={(event) => change("anioCursa", event.target.value)}><option value="">Selecciona un año</option>{Array.from({ length: 10 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}° año</option>)}</select></Field>
              <Field label="Categoria" error={errors.categoria}><input list="student-categories" value={form.categoria} onChange={(event) => change("categoria", event.target.value)} placeholder="Ej. Practica profesional" /><datalist id="student-categories">{categories.map((category) => <option key={category}>{category}</option>)}</datalist></Field>
              <Field label="Estado"><select value={form.estado} onChange={(event) => change("estado", event.target.value)}><option>Activo</option><option>Inactivo</option></select></Field>
            </div>
          </section>
          <footer className="drawer-footer"><button type="button" className="button secondary" onClick={onClose}>Cancelar</button><button type="submit" className="button primary"><Icon name="check" /> {form.id ? "Guardar cambios" : "Registrar alumno"}</button></footer>
        </form>
      </aside>
    </div>
  );
}
