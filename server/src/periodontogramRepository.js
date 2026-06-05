import { getPool } from "./db.js";

export async function patientExists(patientId) {
  const pool = await getPool();
  const [rows] = await pool.execute("SELECT id FROM pacientes WHERE id = ?", [patientId]);
  return Boolean(rows[0]);
}

export async function getLatestPeriodontogram(patientId) {
  const pool = await getPool();
  const [records] = await pool.execute(`
    SELECT
      id,
      paciente_id AS patientId,
      diagnostico AS diagnosis,
      planificacion AS planning,
      seguimiento AS followUp,
      actor,
      DATE_FORMAT(fecha_registro, '%Y-%m-%d %H:%i:%s') AS recordedAt
    FROM periodontograma_registros
    WHERE paciente_id = ?
    ORDER BY fecha_registro DESC, id DESC
    LIMIT 1
  `, [patientId]);
  const record = records[0];
  if (!record) return { record: null, measurements: [], history: [] };
  const [measurements] = await pool.execute(`
    SELECT
      pieza AS tooth,
      sitio AS site,
      profundidad_sondaje_mm AS probingDepth,
      margen_gingival_mm AS gingivalMargin,
      sangrado AS bleeding,
      supuracion AS suppuration,
      placa AS plaque,
      furcacion AS furcation,
      implante AS implant,
      movilidad AS mobility
    FROM periodontograma_mediciones
    WHERE registro_id = ?
    ORDER BY pieza, FIELD(sitio, 'MV', 'V', 'DV', 'MP', 'P', 'DP')
  `, [record.id]);
  const [history] = await pool.execute(`
    SELECT
      id,
      DATE_FORMAT(fecha_registro, '%Y-%m-%d %H:%i:%s') AS recordedAt,
      actor
    FROM periodontograma_registros
    WHERE paciente_id = ?
    ORDER BY fecha_registro DESC, id DESC
    LIMIT 10
  `, [patientId]);
  return { record, measurements, history };
}

export async function savePeriodontogram(patientId, payload, actor) {
  const pool = await getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [record] = await connection.execute(`
      INSERT INTO periodontograma_registros (
        paciente_id, diagnostico, planificacion, seguimiento, actor
      )
      VALUES (?, ?, ?, ?, ?)
    `, [
      patientId,
      payload.diagnosis || null,
      payload.planning || null,
      payload.followUp || null,
      actor,
    ]);
    if (payload.measurements.length) {
      const values = payload.measurements.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ");
      const params = payload.measurements.flatMap((item) => [
        record.insertId,
        item.tooth,
        item.site,
        item.probingDepth,
        item.gingivalMargin,
        item.bleeding ? 1 : 0,
        item.suppuration ? 1 : 0,
        item.plaque ? 1 : 0,
        item.furcation ? 1 : 0,
        item.implant ? 1 : 0,
        item.mobility,
      ]);
      await connection.execute(`
        INSERT INTO periodontograma_mediciones (
          registro_id, pieza, sitio, profundidad_sondaje_mm, margen_gingival_mm,
          sangrado, supuracion, placa, furcacion, implante, movilidad
        )
        VALUES ${values}
      `, params);
    }
    await connection.commit();
    return getLatestPeriodontogram(patientId);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
