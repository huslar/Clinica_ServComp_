import React, { useEffect, useMemo, useState } from "react";
import { PatientForm } from "./components/PatientForm";
import { ProfessionalModule } from "./components/ProfessionalModule";
import { StudentModule } from "./components/StudentModule";
import { ScheduleModule } from "./components/ScheduleModule";
import { FingerprintEnrollmentModule } from "./components/FingerprintEnrollmentModule";
import { OdontogramModule } from "./components/OdontogramModule";
import { OdontogramVisualModule } from "./components/OdontogramVisualModule";
import { OdontogramSurfaceModule } from "./components/OdontogramSurfaceModule";
import { OdontogramCombinedModule } from "./components/OdontogramCombinedModule";
import { PeriodontogramModule } from "./components/PeriodontogramModule";
import { PeriodontogramGraphicModule } from "./components/PeriodontogramGraphicModule";
import { AppointmentModule } from "./components/AppointmentModule";
import { Icon } from "./components/Icons";
import { patientService } from "./services/patientService";
import { formatDate, initials } from "./utils/patient";

const PAGE_SIZE = 5;

function exportCsv(patients) {
  const fields = ["id", "rut", "nombres", "apellidoPaterno", "apellidoMaterno", "fechaNacimiento", "estadoCivil", "genero", "direccion", "comuna", "movil", "correo", "profesion", "estado", "fechaIngreso"];
  const rows = patients.map((patient) => fields.map((field) => `"${String(patient[field] ?? "").replaceAll('"', '""')}"`).join(";"));
  const blob = new Blob([[fields.join(";"), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "pacientes.csv";
  link.click();
  URL.revokeObjectURL(link.href);
}

function App() {
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [editing, setEditing] = useState(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState("");
  const [activeModule, setActiveModule] = useState("Pacientes");
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    patientService.list()
      .then(setPatients)
      .catch((error) => setToast(error.message));
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(timer);
  }, [toast]);

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return patients.filter((patient) => {
      const matchesStatus = status === "Todos" || patient.estado === status;
      const matchesQuery = !normalized || [patient.rut, patient.nombres, patient.apellidoPaterno, patient.apellidoMaterno, patient.correo]
        .join(" ").toLowerCase().includes(normalized);
      return matchesStatus && matchesQuery;
    });
  }, [patients, query, status]);

  const activeCount = patients.filter((patient) => patient.estado === "Activo").length;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function openNew() {
    setEditing(undefined);
    setFormOpen(true);
  }

  function openEdit(patient) {
    setEditing(patient);
    setFormOpen(true);
  }

  function showPendingModule(module) {
    if (module === "Pacientes" || module === "Profesionales" || module === "Alumnos" || module === "Horarios profesionales" || module === "Horarios alumnos" || module === "Enrolamiento de huella" || module === "Odontograma de hallazgos" || module === "Odontograma de hallazgos (2)" || module === "Odontograma de hallazgos (3)" || module === "Odontograma de hallazgos (4)" || module === "Periodontograma" || module === "Periodontograma (2)" || module === "Periodontograma (3)" || module === "Reservas") {
      setActiveModule(module);
      return;
    }
    setToast(`${module}: modulo disponible proximamente`);
  }

  function navigate(module) {
    showPendingModule(module);
    setNavOpen(false);
  }

  async function save(patient) {
    try {
      if (patient.id) {
        const updated = await patientService.update(patient.id, patient);
        setPatients((current) => current.map((item) => item.id === updated.id ? updated : item));
      } else {
        const created = await patientService.create(patient);
        setPatients((current) => [created, ...current]);
      }
      setFormOpen(false);
      setToast(patient.id ? "Paciente actualizado correctamente" : "Paciente registrado correctamente");
    } catch (error) {
      setToast(error.message);
    }
  }

  async function remove(patient) {
    if (!window.confirm(`¿Eliminar la ficha de ${patient.nombres} ${patient.apellidoPaterno}?`)) return;
    try {
      await patientService.remove(patient.id);
      setPatients((current) => current.filter((item) => item.id !== patient.id));
      setToast("Paciente eliminado correctamente");
    } catch (error) {
      setToast(error.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><span>+</span></div>
          <div><strong>Salud Central ServComp</strong><small>Gestion clinica</small></div>
        </div>
        <button className="menu-toggle" onClick={() => setNavOpen((current) => !current)} aria-label="Abrir menu principal" aria-expanded={navOpen}>
          <Icon name={navOpen ? "close" : "menu"} size={21} />
        </button>
        <nav className={`main-nav ${navOpen ? "open" : ""}`} aria-label="Navegacion principal">
          <button onClick={() => navigate("Inicio")}>Inicio</button>
          <button onClick={() => navigate("Parametros")}>Parametros</button>
          <div className="nav-dropdown">
            <button className="active" aria-haspopup="true">Mantenedor <Icon name="chevronDown" size={13} /></button>
            <div className="nav-dropdown-menu">
              <button className={activeModule === "Pacientes" ? "current" : ""} onClick={() => navigate("Pacientes")}><Icon name="users" size={16} />Pacientes</button>
              <button className={activeModule === "Profesionales" ? "current" : ""} onClick={() => navigate("Profesionales")}><Icon name="briefcase" size={16} />Profesionales</button>
              <button className={activeModule === "Alumnos" ? "current" : ""} onClick={() => navigate("Alumnos")}><Icon name="graduation" size={16} />Alumnos</button>
              <button className={activeModule === "Enrolamiento de huella" ? "current" : ""} onClick={() => navigate("Enrolamiento de huella")}><Icon name="fingerprint" size={16} />Enrolamiento de huella</button>
              <div className="nav-submenu">
                <button className={activeModule.startsWith("Horarios") ? "current" : ""}><Icon name="calendar" size={16} />Horarios <Icon name="arrowRight" size={13} /></button>
                <div className="nav-submenu-menu">
                  <button className={activeModule === "Horarios profesionales" ? "current" : ""} onClick={() => navigate("Horarios profesionales")}><Icon name="briefcase" size={15} />Horarios profesionales</button>
                  <button className={activeModule === "Horarios alumnos" ? "current" : ""} onClick={() => navigate("Horarios alumnos")}><Icon name="graduation" size={15} />Horarios alumnos</button>
                </div>
              </div>
            </div>
          </div>
          <div className="nav-dropdown">
            <button className={activeModule.startsWith("Odontograma") || activeModule.startsWith("Periodontograma") ? "active" : ""} aria-haspopup="true"><Icon name="tooth" size={16} />Clinico-Odontologico <Icon name="chevronDown" size={13} /></button>
            <div className="nav-dropdown-menu clinical-dropdown-menu">
              <button className={activeModule === "Odontograma de hallazgos" ? "current" : ""} onClick={() => navigate("Odontograma de hallazgos")}><Icon name="tooth" size={16} />Odontograma de hallazgos</button>
              <button className={activeModule === "Odontograma de hallazgos (2)" ? "current" : ""} onClick={() => navigate("Odontograma de hallazgos (2)")}><Icon name="tooth" size={16} />Odontograma de hallazgos (2)</button>
              <button className={activeModule === "Odontograma de hallazgos (3)" ? "current" : ""} onClick={() => navigate("Odontograma de hallazgos (3)")}><Icon name="tooth" size={16} />Odontograma de hallazgos (3)</button>
              <button className={activeModule === "Odontograma de hallazgos (4)" ? "current" : ""} onClick={() => navigate("Odontograma de hallazgos (4)")}><Icon name="tooth" size={16} />Odontograma de hallazgos (4)</button>
              <button className={activeModule === "Periodontograma" ? "current" : ""} onClick={() => navigate("Periodontograma")}><Icon name="activity" size={16} />Periodontograma</button>
              <button className={activeModule === "Periodontograma (2)" ? "current" : ""} onClick={() => navigate("Periodontograma (2)")}><Icon name="activity" size={16} />Periodontograma (2)</button>
              <button className={activeModule === "Periodontograma (3)" ? "current" : ""} onClick={() => navigate("Periodontograma (3)")}><Icon name="activity" size={16} />Periodontograma (3)</button>
            </div>
          </div>
          <button className={activeModule === "Reservas" ? "active" : ""} onClick={() => navigate("Reservas")}><Icon name="calendar" size={16} />Reservas</button>
          <button onClick={() => navigate("Almacenamiento")}>Almacenamiento</button>
          <button className="logout" onClick={() => navigate("Salir")}>Salir</button>
        </nav>
        <div className="topbar-right">
          <span className="user-avatar">HA</span>
          <div className="user-copy"><strong>Administrador</strong><small>Gestion de pacientes</small></div>
        </div>
      </header>

      <main>
        {activeModule === "Profesionales" ? <ProfessionalModule onNotify={setToast} /> : activeModule === "Alumnos" ? <StudentModule onNotify={setToast} /> : activeModule === "Horarios profesionales" ? <ScheduleModule onNotify={setToast} /> : activeModule === "Horarios alumnos" ? <ScheduleModule mode="students" onNotify={setToast} /> : activeModule === "Enrolamiento de huella" ? <FingerprintEnrollmentModule onNotify={setToast} /> : activeModule === "Odontograma de hallazgos" ? <OdontogramModule onNotify={setToast} /> : activeModule === "Odontograma de hallazgos (2)" ? <OdontogramVisualModule onNotify={setToast} /> : activeModule === "Odontograma de hallazgos (3)" ? <OdontogramSurfaceModule onNotify={setToast} /> : activeModule === "Odontograma de hallazgos (4)" ? <OdontogramCombinedModule onNotify={setToast} /> : activeModule === "Periodontograma" ? <PeriodontogramModule onNotify={setToast} /> : activeModule === "Periodontograma (2)" ? <PeriodontogramGraphicModule onNotify={setToast} /> : activeModule === "Periodontograma (3)" ? <PeriodontogramGraphicModule setMode onNotify={setToast} /> : activeModule === "Reservas" ? <AppointmentModule onNotify={setToast} /> : (
        <>
        <section className="hero">
          <div>
            <p className="eyebrow">Administracion clinica</p>
            <h1>PACIENTES</h1>
            <p className="hero-copy">Gestiona la informacion de tus pacientes de forma simple, segura y centralizada.</p>
          </div>
          <button className="button primary large" onClick={openNew}><Icon name="plus" /> Registrar paciente</button>
        </section>

        <section className="stats">
          <article><div className="stat-icon teal"><Icon name="users" /></div><div><small>Total pacientes</small><strong>{patients.length}</strong><p>Registro historico</p></div></article>
          <article><div className="stat-icon green"><Icon name="activity" /></div><div><small>Pacientes activos</small><strong>{activeCount}</strong><p>{patients.length ? Math.round(activeCount * 100 / patients.length) : 0}% del total registrado</p></div></article>
          <article><div className="stat-icon gold"><Icon name="calendar" /></div><div><small>Ingresos este mes</small><strong>{patients.filter((patient) => patient.fechaIngreso.startsWith("2026-06")).length}</strong><p>Actualizado recientemente</p></div></article>
          <article><div className="stat-icon purple"><Icon name="database" /></div><div><small>Calidad de datos</small><strong>100%</strong><p>Fichas con contacto</p></div></article>
        </section>

        <section className="content-card">
          <div className="card-heading">
            <div>
              <h2>Listado de pacientes</h2>
              <p>Consulta, edita y administra las fichas registradas.</p>
            </div>
            <button className="button ghost" onClick={() => exportCsv(filtered)}><Icon name="download" /> Exportar</button>
          </div>

          <div className="toolbar">
            <label className="search-box"><Icon name="search" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar por nombre, RUT o correo..." /></label>
            <div className="status-filter"><Icon name="filter" /><span>Estado</span>{["Todos", "Activo", "Inactivo"].map((option) => <button key={option} className={status === option ? "selected" : ""} onClick={() => { setStatus(option); setPage(1); }}>{option}</button>)}</div>
          </div>

          <div className="table-wrap">
            <table>
              <thead><tr><th>Paciente</th><th>RUT</th><th>Contacto</th><th>Profesion</th><th>Estado</th><th>Ingreso</th><th aria-label="Acciones" /></tr></thead>
              <tbody>
                {visible.map((patient) => (
                  <tr key={patient.id}>
                    <td><div className="patient-cell"><span className="patient-avatar">{initials(patient)}</span><div><strong>{patient.nombres} {patient.apellidoPaterno}</strong><small>{patient.apellidoMaterno} · #{patient.id}</small></div></div></td>
                    <td><span className="rut">{patient.rut}</span></td>
                    <td><div className="contact-cell"><strong>{patient.movil}</strong><small>{patient.correo}</small></div></td>
                    <td>{patient.profesion}</td>
                    <td><span className={`badge ${patient.estado.toLowerCase()}`}><i />{patient.estado}</span></td>
                    <td>{formatDate(patient.fechaIngreso)}</td>
                    <td><div className="row-actions"><button onClick={() => openEdit(patient)} aria-label="Editar"><Icon name="edit" size={16} /></button><button onClick={() => remove(patient)} aria-label="Eliminar"><Icon name="trash" size={16} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!visible.length && <div className="empty-state"><Icon name="search" size={28} /><h3>No encontramos pacientes</h3><p>Prueba ajustando tu busqueda o registra una nueva ficha.</p></div>}
          </div>

          <footer className="pagination">
            <p>Mostrando <strong>{visible.length}</strong> de <strong>{filtered.length}</strong> pacientes</p>
            <div><button disabled={page === 1} onClick={() => setPage((current) => current - 1)}><Icon name="arrowLeft" size={16} /></button><span>Pagina {page} de {totalPages}</span><button disabled={page === totalPages} onClick={() => setPage((current) => current + 1)}><Icon name="arrowRight" size={16} /></button></div>
          </footer>
        </section>
        </>
        )}
      </main>

      {formOpen && <PatientForm patient={editing} onClose={() => setFormOpen(false)} onSave={save} />}
      {toast && <div className="toast"><Icon name="check" />{toast}</div>}
    </div>
  );
}

export default App;
