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
  carrera_especialidad AS carreraEspecialidad,
  anio_cursa AS anioCursa,
  categoria,
  estado,
  DATE_FORMAT(fecha_ingreso_sistema, '%Y-%m-%d') AS fechaIngreso
`;

function values(student) {
  return [
    student.rut, student.nombres, student.apellidoPaterno,
    student.apellidoMaterno, student.fechaNacimiento, student.estadoCivil,
    student.genero, student.direccion, student.comuna, student.movil,
    student.correo, student.profesion, student.carreraEspecialidad,
    student.anioCursa, student.categoria, student.estado,
  ];
}

export async function listStudents() {
  const pool = await getPool();
  const [rows] = await pool.query(`
    SELECT ${selectColumns}
    FROM alumnos
    ORDER BY fecha_ingreso_sistema DESC, id DESC
  `);
  return rows;
}

export async function findStudentByRut(rut) {
  const pool = await getPool();
  const [rows] = await pool.execute(`
    SELECT ${selectColumns}
    FROM alumnos
    WHERE rut = ?
  `, [rut]);
  return rows[0];
}

async function findStudent(id) {
  const pool = await getPool();
  const [rows] = await pool.execute(`
    SELECT ${selectColumns}
    FROM alumnos
    WHERE id = ?
  `, [id]);
  return rows[0];
}

export async function createStudent(student) {
  const pool = await getPool();
  const [result] = await pool.execute(`
    INSERT INTO alumnos (
      rut, nombres, apellido_paterno, apellido_materno, fecha_nacimiento,
      estado_civil, genero, direccion, comuna, movil, correo, profesion,
      carrera_especialidad, anio_cursa, categoria, estado
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, values(student));
  return findStudent(result.insertId);
}

export async function updateStudent(id, student) {
  const pool = await getPool();
  await pool.execute(`
    UPDATE alumnos
    SET rut = ?, nombres = ?, apellido_paterno = ?, apellido_materno = ?,
        fecha_nacimiento = ?, estado_civil = ?, genero = ?, direccion = ?,
        comuna = ?, movil = ?, correo = ?, profesion = ?, carrera_especialidad = ?,
        anio_cursa = ?, categoria = ?, estado = ?
    WHERE id = ?
  `, [...values(student), id]);
  return findStudent(id);
}

export async function removeStudent(id) {
  const pool = await getPool();
  const [result] = await pool.execute("DELETE FROM alumnos WHERE id = ?", [id]);
  return result.affectedRows > 0;
}
