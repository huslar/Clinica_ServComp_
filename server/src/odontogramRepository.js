import { getPool } from "./db.js";

const eventColumns = `
  e.id,
  e.paciente_id AS patientId,
  e.tipo_evento AS eventType,
  e.denticion AS dentition,
  e.pieza AS tooth,
  e.superficie AS surface,
  e.tipo_hallazgo AS findingType,
  e.severidad AS severity,
  e.nota_clinica AS clinicalNote,
  e.evento_referencia_id AS referenceEventId,
  e.actor,
  e.origen AS source,
  e.solicitud_id AS requestId,
  DATE_FORMAT(e.fecha_evento, '%Y-%m-%d %H:%i:%s') AS occurredAt
`;

export async function patientExists(patientId) {
  const pool = await getPool();
  const [rows] = await pool.execute("SELECT id FROM pacientes WHERE id = ?", [patientId]);
  return Boolean(rows[0]);
}

async function insertEvent(connection, patientId, event, context) {
  const [result] = await connection.execute(`
    INSERT INTO odontograma_eventos (
      paciente_id, tipo_evento, denticion, pieza, superficie, tipo_hallazgo,
      severidad, nota_clinica, evento_referencia_id, actor, origen, solicitud_id
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    patientId, event.eventType, event.dentition || null, event.tooth || null,
    event.surface || null, event.findingType || null, event.severity || null,
    event.clinicalNote || null, event.referenceEventId || null,
    context.actor, context.source, context.requestId,
  ]);
  return result.insertId;
}

export async function appendOdontogramEvent(patientId, event, context) {
  const pool = await getPool();
  return insertEvent(pool, patientId, event, context);
}

export async function listOdontogram(patientId) {
  const pool = await getPool();
  const [findings] = await pool.execute(`
    SELECT ${eventColumns}
    FROM odontograma_eventos e
    LEFT JOIN odontograma_eventos a
      ON a.evento_referencia_id = e.id
      AND a.tipo_evento = 'HALLAZGO_ANULADO'
    WHERE e.paciente_id = ?
      AND e.tipo_evento = 'HALLAZGO_REGISTRADO'
      AND a.id IS NULL
    ORDER BY e.fecha_evento DESC, e.id DESC
  `, [patientId]);
  const [history] = await pool.execute(`
    SELECT ${eventColumns}
    FROM odontograma_eventos e
    WHERE e.paciente_id = ?
    ORDER BY e.fecha_evento DESC, e.id DESC
    LIMIT 120
  `, [patientId]);
  return { findings, history };
}

export async function annulFinding(patientId, findingId, reason, context) {
  const pool = await getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(`
      SELECT e.id, e.denticion AS dentition, e.pieza AS tooth
      FROM odontograma_eventos e
      LEFT JOIN odontograma_eventos a
        ON a.evento_referencia_id = e.id
        AND a.tipo_evento = 'HALLAZGO_ANULADO'
      WHERE e.id = ?
        AND e.paciente_id = ?
        AND e.tipo_evento = 'HALLAZGO_REGISTRADO'
        AND a.id IS NULL
      FOR UPDATE
    `, [findingId, patientId]);
    const finding = rows[0];
    if (!finding) return false;
    await insertEvent(connection, patientId, {
      eventType: "HALLAZGO_ANULADO",
      dentition: finding.dentition,
      tooth: finding.tooth,
      clinicalNote: reason,
      referenceEventId: findingId,
    }, context);
    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
