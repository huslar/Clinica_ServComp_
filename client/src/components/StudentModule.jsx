import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icons";
import { StudentForm } from "./StudentForm";
import { studentService } from "../services/studentService";
import { formatDate, initials } from "../utils/patient";

const PAGE_SIZE = 5;

export function StudentModule({ onNotify }) {
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [editing, setEditing] = useState();
  const [formOpen, setFormOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => { studentService.list().then(setStudents).catch((error) => onNotify(error.message)); }, []);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return students.filter((student) => {
      const matchesStatus = status === "Todos" || student.estado === status;
      const matchesQuery = !normalized || [student.rut, student.nombres, student.apellidoPaterno, student.apellidoMaterno, student.carreraEspecialidad, student.categoria].join(" ").toLowerCase().includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [students, query, status]);

  const activeCount = students.filter((item) => item.estado === "Activo").length;
  const internshipCount = students.filter((item) => item.categoria === "Internado").length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function save(student) {
    try {
      if (student.id) {
        const updated = await studentService.update(student.id, student);
        setStudents((current) => current.map((item) => item.id === updated.id ? updated : item));
      } else {
        const created = await studentService.create(student);
        setStudents((current) => [created, ...current]);
      }
      setFormOpen(false);
      onNotify(student.id ? "Alumno actualizado correctamente" : "Alumno registrado correctamente");
    } catch (error) { onNotify(error.message); }
  }

  async function remove(student) {
    if (!window.confirm(`Eliminar la ficha de ${student.nombres} ${student.apellidoPaterno}?`)) return;
    try {
      await studentService.remove(student.id);
      setStudents((current) => current.filter((item) => item.id !== student.id));
      onNotify("Alumno eliminado correctamente");
    } catch (error) { onNotify(error.message); }
  }

  return (
    <>
      <section className="hero"><div><p className="eyebrow">Administracion clinica</p><h1>ALUMNOS</h1><p className="hero-copy">Gestiona estudiantes, internos y practicantes vinculados a la institucion.</p></div><button className="button primary large" onClick={() => { setEditing(undefined); setFormOpen(true); }}><Icon name="plus" /> Registrar alumno</button></section>
      <section className="stats">
        <article><div className="stat-icon teal"><Icon name="graduation" /></div><div><small>Total alumnos</small><strong>{students.length}</strong><p>Registro academico</p></div></article>
        <article><div className="stat-icon green"><Icon name="activity" /></div><div><small>Alumnos activos</small><strong>{activeCount}</strong><p>Vinculados actualmente</p></div></article>
        <article><div className="stat-icon gold"><Icon name="briefcase" /></div><div><small>Internados</small><strong>{internshipCount}</strong><p>Experiencia clinica</p></div></article>
        <article><div className="stat-icon purple"><Icon name="database" /></div><div><small>Carreras</small><strong>{new Set(students.map((item) => item.carreraEspecialidad)).size}</strong><p>Areas formativas</p></div></article>
      </section>
      <section className="content-card">
        <div className="card-heading"><div><h2>Listado de alumnos</h2><p>Consulta y administra las fichas academicas.</p></div></div>
        <div className="toolbar"><label className="search-box"><Icon name="search" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar por nombre, RUT, carrera o categoria..." /></label><div className="status-filter"><Icon name="filter" /><span>Estado</span>{["Todos", "Activo", "Inactivo"].map((option) => <button key={option} className={status === option ? "selected" : ""} onClick={() => { setStatus(option); setPage(1); }}>{option}</button>)}</div></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Alumno</th><th>RUT</th><th>Carrera</th><th>Año</th><th>Categoria</th><th>Contacto</th><th>Estado</th><th>Ingreso</th><th aria-label="Acciones" /></tr></thead>
            <tbody>{visible.map((student) => <tr key={student.id}><td><div className="patient-cell"><span className="patient-avatar">{initials(student)}</span><div><strong>{student.nombres} {student.apellidoPaterno}</strong><small>{student.apellidoMaterno} · #{student.id}</small></div></div></td><td><span className="rut">{student.rut}</span></td><td>{student.carreraEspecialidad}</td><td><span className="year-badge">{student.anioCursa}° año</span></td><td>{student.categoria}</td><td><div className="contact-cell"><strong>{student.movil}</strong><small>{student.correo}</small></div></td><td><span className={`badge ${student.estado.toLowerCase()}`}><i />{student.estado}</span></td><td>{formatDate(student.fechaIngreso)}</td><td><div className="row-actions"><button onClick={() => { setEditing(student); setFormOpen(true); }} aria-label="Editar"><Icon name="edit" size={16} /></button><button onClick={() => remove(student)} aria-label="Eliminar"><Icon name="trash" size={16} /></button></div></td></tr>)}</tbody>
          </table>
          {!visible.length && <div className="empty-state"><Icon name="search" size={28} /><h3>No encontramos alumnos</h3><p>Prueba ajustando la busqueda o registra una nueva ficha.</p></div>}
        </div>
        <footer className="pagination"><p>Mostrando <strong>{visible.length}</strong> de <strong>{filtered.length}</strong> alumnos</p><div><button disabled={page === 1} onClick={() => setPage((current) => current - 1)}><Icon name="arrowLeft" size={16} /></button><span>Pagina {page} de {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}><Icon name="arrowRight" size={16} /></button></div></footer>
      </section>
      {formOpen && <StudentForm student={editing} onClose={() => setFormOpen(false)} onSave={save} />}
    </>
  );
}
