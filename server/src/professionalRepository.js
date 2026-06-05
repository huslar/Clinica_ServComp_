import { getPool } from "./db.js";

const selectColumns = `
  id,
  rut,
  nombres,
  apellido_paterno AS apellidoPaterno,
  apellido_materno AS apellidoMaterno,
  DATE_FORMAT(fecha_nacimiento, '%Y-%m-%d') AS fechaNacimiento,
  estado_civil AS estadoCivil,
  genero,
  direccion,
  comuna,
  movil,
  correo,
  profesion,
  tipo_personal AS tipoPersonal,
  area_trabajo AS areaTrabajo,
  especialidad,
  estado,
  DATE_FORMAT(fecha_ingreso_sistema, '%Y-%m-%d') AS fechaIngreso
`;

function values(professional) {
  return [
    professional.rut, professional.nombres, professional.apellidoPaterno,
    professional.apellidoMaterno, professional.fechaNacimiento, professional.estadoCivil,
    professional.genero, professional.direccion, professional.comuna,
    professional.movil, professional.correo, professional.profesion,
    professional.tipoPersonal, professional.areaTrabajo,
    professional.especialidad || "No aplica", professional.estado,
  ];
}

export async function listProfessionals() {
  const pool = await getPool();
  const [rows] = await pool.query(`
    SELECT ${selectColumns}
    FROM profesionales
    ORDER BY fecha_ingreso_sistema DESC, id DESC
  `);
  return rows;
}

export async function findProfessionalByRut(rut) {
  const pool = await getPool();
  const [rows] = await pool.execute(`
    SELECT ${selectColumns}
    FROM profesionales
    WHERE rut = ?
  `, [rut]);
  return rows[0];
}

async function findProfessional(id) {
  const pool = await getPool();
  const [rows] = await pool.execute(`
    SELECT ${selectColumns}
    FROM profesionales
    WHERE id = ?
  `, [id]);
  return rows[0];
}

export async function createProfessional(professional) {
  const pool = await getPool();
  const [result] = await pool.execute(`
    INSERT INTO profesionales (
      rut, nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
      estado_civil, genero, direccion, comuna, movil, correo, profesion,
      tipo_personal, area_trabajo, especialidad, estado
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, values(professional));
  return findProfessional(result.insertId);
}

export async function updateProfessional(id, professional) {
  const pool = await getPool();
  await pool.execute(`
    UPDATE profesionales
    SET rut = ?, nombres = ?, apellido_paterno = ?, apellido_materno = ?,
        fecha_nacimiento = ?, estado_civil = ?, genero = ?, direccion = ?,
        comuna = ?, movil = ?, correo = ?, profesion = ?, tipo_personal = ?,
        area_trabajo = ?, especialidad = ?, estado = ?
    WHERE id = ?
  `, [...values(professional), id]);
  return findProfessional(id);
}

export async function removeProfessional(id) {
  const pool = await getPool();
  const [result] = await pool.execute("DELETE FROM profesionales WHERE id = ?", [id]);
  return result.affectedRows > 0;
}
