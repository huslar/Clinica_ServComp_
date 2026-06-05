import { getPool } from "./db.js";

export async function listStudentScheduleBlocks(studentId) {
  const pool = await getPool();
  const [rows] = await pool.execute(`
    SELECT
      id,
      alumno_id AS studentId,
      dia_semana AS dayOfWeek,
      TIME_FORMAT(hora_inicio, '%H:%i') AS startTime
    FROM horarios_alumnos
    WHERE alumno_id = ?
    ORDER BY dia_semana, hora_inicio
  `, [studentId]);
  return rows;
}

export async function replaceStudentScheduleBlocks(studentId, blocks) {
  const pool = await getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM horarios_alumnos WHERE alumno_id = ?", [studentId]);
    if (blocks.length) {
      const values = blocks.map(() => "(?, ?, ?)").join(", ");
      const params = blocks.flatMap((block) => [studentId, block.dayOfWeek, block.startTime]);
      await connection.execute(`
        INSERT INTO horarios_alumnos (alumno_id, dia_semana, hora_inicio)
        VALUES ${values}
      `, params);
    }
    await connection.commit();
    return listStudentScheduleBlocks(studentId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
