import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "./Icons";
import { ProfessionalForm } from "./ProfessionalForm";
import { professionalService } from "../services/professionalService";
import { formatDate, initials } from "../utils/patient";

const PAGE_SIZE = 5;

export function ProfessionalModule({ onNotify }) {
  const [professionals, setProfessionals] = useState([]);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("Todos");
  const [editing, setEditing] = useState();
  const [formOpen, setFormOpen] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    professionalService.list().then(setProfessionals).catch((error) => onNotify(error.message));
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return professionals.filter((professional) => {
      const matchesType = type === "Todos" || professional.tipoPersonal === type;
      const matchesQuery = !normalized || [professional.rut, professional.nombres, professional.apellidoPaterno, professional.apellidoMaterno, professional.areaTrabajo, professional.especialidad]
        .join(" ").toLowerCase().includes(normalized);
      return matchesType && matchesQuery;
    });
  }, [professionals, query, type]);

  const activeCount = professionals.filter((item) => item.estado === "Activo").length;
  const healthCount = professionals.filter((item) => item.tipoPersonal === "Salud").length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function save(professional) {
    try {
      if (professional.id) {
        const updated = await professionalService.update(professional.id, professional);
        setProfessionals((current) => current.map((item) => item.id === updated.id ? updated : item));
      } else {
        const created = await professionalService.create(professional);
        setProfessionals((current) => [created, ...current]);
      }
      setFormOpen(false);
      onNotify(professional.id ? "Profesional actualizado correctamente" : "Profesional registrado correctamente");
    } catch (error) {
      onNotify(error.message);
    }
  }

  async function remove(professional) {
    if (!window.confirm(`Eliminar la ficha de ${professional.nombres} ${professional.apellidoPaterno}?`)) return;
    try {
      await professionalService.remove(professional.id);
      setProfessionals((current) => current.filter((item) => item.id !== professional.id));
      onNotify("Profesional eliminado correctamente");
    } catch (error) {
      onNotify(error.message);
    }
  }

  return (
    <>
      <section className="hero">
        <div><p className="eyebrow">Administracion clinica</p><h1>PROFESIONALES</h1><p className="hero-copy">Gestiona el personal de salud y administracion desde un registro centralizado.</p></div>
        <button className="button primary large" onClick={() => { setEditing(undefined); setFormOpen(true); }}><Icon name="plus" /> Registrar profesional</button>
      </section>

      <section className="stats">
        <article><div className="stat-icon teal"><Icon name="briefcase" /></div><div><small>Total profesionales</small><strong>{professionals.length}</strong><p>Registro institucional</p></div></article>
        <article><div className="stat-icon green"><Icon name="activity" /></div><div><small>Personal activo</small><strong>{activeCount}</strong><p>Disponible en el sistema</p></div></article>
        <article><div className="stat-icon gold"><Icon name="users" /></div><div><small>Profesionales de salud</small><strong>{healthCount}</strong><p>Atencion clinica</p></div></article>
        <article><div className="stat-icon purple"><Icon name="database" /></div><div><small>Administracion</small><strong>{professionals.length - healthCount}</strong><p>Gestion interna</p></div></article>
      </section>

      <section className="content-card">
        <div className="card-heading"><div><h2>Listado de profesionales</h2><p>Consulta y administra las fichas del equipo.</p></div></div>
        <div className="toolbar">
          <label className="search-box"><Icon name="search" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar por nombre, RUT, area o especialidad..." /></label>
          <div className="status-filter"><Icon name="filter" /><span>Tipo</span>{["Todos", "Salud", "Administracion"].map((option) => <button key={option} className={type === option ? "selected" : ""} onClick={() => { setType(option); setPage(1); }}>{option}</button>)}</div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Profesional</th><th>RUT</th><th>Tipo</th><th>Area y especialidad</th><th>Contacto</th><th>Estado</th><th>Ingreso</th><th aria-label="Acciones" /></tr></thead>
            <tbody>{visible.map((professional) => (
              <tr key={professional.id}>
                <td><div className="patient-cell"><span className="patient-avatar">{initials(professional)}</span><div><strong>{professional.nombres} {professional.apellidoPaterno}</strong><small>{professional.profesion} · #{professional.id}</small></div></div></td>
                <td><span className="rut">{professional.rut}</span></td>
                <td><span className={`staff-badge ${professional.tipoPersonal === "Salud" ? "health" : "admin"}`}>{professional.tipoPersonal}</span></td>
                <td><div className="contact-cell"><strong>{professional.areaTrabajo}</strong><small>{professional.especialidad}</small></div></td>
                <td><div className="contact-cell"><strong>{professional.movil}</strong><small>{professional.correo}</small></div></td>
                <td><span className={`badge ${professional.estado.toLowerCase()}`}><i />{professional.estado}</span></td>
                <td>{formatDate(professional.fechaIngreso)}</td>
                <td><div className="row-actions"><button onClick={() => { setEditing(professional); setFormOpen(true); }} aria-label="Editar"><Icon name="edit" size={16} /></button><button onClick={() => remove(professional)} aria-label="Eliminar"><Icon name="trash" size={16} /></button></div></td>
              </tr>
            ))}</tbody>
          </table>
          {!visible.length && <div className="empty-state"><Icon name="search" size={28} /><h3>No encontramos profesionales</h3><p>Prueba ajustando la busqueda o registra una nueva ficha.</p></div>}
        </div>
        <footer className="pagination"><p>Mostrando <strong>{visible.length}</strong> de <strong>{filtered.length}</strong> profesionales</p><div><button disabled={page === 1} onClick={() => setPage((current) => current - 1)}><Icon name="arrowLeft" size={16} /></button><span>Pagina {page} de {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}><Icon name="arrowRight" size={16} /></button></div></footer>
      </section>
      {formOpen && <ProfessionalForm professional={editing} onClose={() => setFormOpen(false)} onSave={save} />}
    </>
  );
}
