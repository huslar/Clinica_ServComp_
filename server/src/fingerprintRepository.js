import { getPool } from "./db.js";
import { protectFingerprintTemplate, revealFingerprintTemplate } from "./fingerprintCrypto.js";

const statusColumns = `
  p.id AS professionalId,
  p.rut,
  p.nombres,
  p.apellido_paterno AS apellidoPaterno,
  p.apellido_materno AS apellidoMaterno,
  p.profesion,
  p.area_trabajo AS areaTrabajo,
  p.especialidad,
  p.estado,
  CASE WHEN h.id IS NULL THEN FALSE ELSE TRUE END AS enrolled,
  h.formato AS fingerprintFormat,
  h.calidad AS fingerprintQuality,
  h.dispositivo AS fingerprintDevice,
  DATE_FORMAT(h.fecha_enrolamiento, '%Y-%m-%d %H:%i:%s') AS enrolledAt
`;

export async function listProfessionalFingerprintStatuses() {
  const pool = await getPool();
  const [rows] = await pool.query(`
    SELECT ${statusColumns}
    FROM profesionales p
    LEFT JOIN huellas_profesionales h ON h.profesional_id = p.id
    WHERE p.estado = 'Activo'
    ORDER BY p.apellido_paterno, p.apellido_materno, p.nombres
  `);
  return rows;
}

export async function findProfessionalFingerprintStatus(professionalId) {
  const pool = await getPool();
  const [rows] = await pool.execute(`
    SELECT ${statusColumns}
    FROM profesionales p
    LEFT JOIN huellas_profesionales h ON h.profesional_id = p.id
    WHERE p.id = ?
  `, [professionalId]);
  return rows[0];
}

export async function createProfessionalFingerprint(professionalId, fingerprint) {
  const pool = await getPool();
  const template = Buffer.from(fingerprint.template, "base64");
  const protectedTemplate = protectFingerprintTemplate(template);
  await pool.execute(`
    INSERT INTO huellas_profesionales (
      profesional_id, plantilla_cifrada, vector_inicializacion, etiqueta_autenticacion,
      resumen_plantilla, formato, calidad, dispositivo
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    professionalId, protectedTemplate.encryptedTemplate, protectedTemplate.iv,
    protectedTemplate.authTag, protectedTemplate.digest, fingerprint.format,
    fingerprint.quality, fingerprint.device,
  ]);
  return findProfessionalFingerprintStatus(professionalId);
}

export async function listFingerprintComparisonCandidates() {
  const pool = await getPool();
  const [rows] = await pool.query(`
    SELECT
      h.profesional_id AS professionalId,
      h.plantilla_cifrada AS encryptedTemplate,
      h.vector_inicializacion AS iv,
      h.etiqueta_autenticacion AS authTag
    FROM huellas_profesionales h
    WHERE h.formato = 'DPFP_PROPRIETARY'
  `);
  return rows.map((row) => ({
    professionalId: row.professionalId,
    template: revealFingerprintTemplate(row.encryptedTemplate, row.iv, row.authTag).toString("base64"),
  }));
}
