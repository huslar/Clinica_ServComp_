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
  estado,
  DATE_FORMAT(fecha_ingreso_sistema, '%Y-%m-%d') AS fechaIngreso
`;

function values(patient) {
  return [
    patient.rut, patient.nombres, patient.apellidoPaterno,
    patient.apellidoMaterno, patient.fechaNacimiento, patient.estadoCivil,
    patient.genero, patient.direccion, patient.comuna,
    patient.movil, patient.correo, patient.profesion, patient.estado,
  ];
}

export async function listPatients() {
  const pool = await getPool();
  const [rows] = await pool.query(`
    SELECT ${selectColumns}
    FROM pacientes
    ORDER BY fecha_ingreso_sistema DESC, id DESC
  `);
  return rows;
}

export async function findPatientByRut(rut) {
  const pool = await getPool();
  const [rows] = await pool.execute(`
    SELECT ${selectColumns}
    FROM pacientes
    WHERE rut = ?
  `, [rut]);
  return rows[0];
}

export async function createPatient(patient) {
  const pool = await getPool();
  const [result] = await pool.execute(`
    INSERT INTO pacientes (
      rut, nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
      estado_civil, genero, direccion, comuna, movil, correo, profesion, estado
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, values(patient));
  return findPatient(result.insertId);
}

export async function updatePatient(id, patient) {
  const pool = await getPool();
  await pool.execute(`
    UPDATE pacientes
    SET rut = ?, nombres = ?, apellido_paterno = ?, apellido_materno = ?,
        fecha_nacimiento = ?, estado_civil = ?, genero = ?, direccion = ?,
        comuna = ?, movil = ?, correo = ?, profesion = ?, estado = ?
    WHERE id = ?
  `, [...values(patient), id]);
  return findPatient(id);
}

async function findPatient(id) {
  const pool = await getPool();
  const [rows] = await pool.execute(`
    SELECT ${selectColumns}
    FROM pacientes
    WHERE id = ?
  `, [id]);
  return rows[0];
}

export async function removePatient(id) {
  const pool = await getPool();
  const [result] = await pool.execute("DELETE FROM pacientes WHERE id = ?", [id]);
  return result.affectedRows > 0;
}
