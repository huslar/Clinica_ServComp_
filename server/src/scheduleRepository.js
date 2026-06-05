import { getPool } from "./db.js";

export async function listScheduleBlocks(professionalId) {
  const pool = await getPool();
  const [rows] = await pool.execute(`
    SELECT
      id,
      profesional_id AS professionalId,
      dia_semana AS dayOfWeek,
      TIME_FORMAT(hora_inicio, '%H:%i') AS startTime
    FROM horarios_profesionales
    WHERE profesional_id = ?
    ORDER BY dia_semana, hora_inicio
  `, [professionalId]);
  return rows;
}

export async function replaceScheduleBlocks(professionalId, blocks) {
  const pool = await getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute("DELETE FROM horarios_profesionales WHERE profesional_id = ?", [professionalId]);
    if (blocks.length) {
      const values = blocks.map(() => "(?, ?, ?)").join(", ");
      const params = blocks.flatMap((block) => [professionalId, block.dayOfWeek, block.startTime]);
      await connection.execute(`
        INSERT INTO horarios_profesionales (profesional_id, dia_semana, hora_inicio)
        VALUES ${values}
      `, params);
    }
    await connection.commit();
    return listScheduleBlocks(professionalId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
