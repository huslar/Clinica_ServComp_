import { getPool } from "./db.js";

const activeStatuses = ["Reservada", "Confirmada", "En espera"];

const selectColumns = `
  rc.id,
  rc.paciente_id AS patientId,
  rc.profesional_id AS professionalId,
  DATE_FORMAT(rc.fecha_reserva, '%Y-%m-%d') AS appointmentDate,
  TIME_FORMAT(rc.hora_inicio, '%H:%i') AS startTime,
  rc.duracion_minutos AS durationMinutes,
  rc.tipo_atencion AS appointmentType,
  rc.estado,
  rc.motivo,
  rc.observaciones,
  CONCAT(p.nombres, ' ', p.apellido_paterno, ' ', p.apellido_materno) AS patientName,
  p.rut AS patientRut,
  CONCAT(pr.nombres, ' ', pr.apellido_paterno) AS professionalName,
  pr.especialidad AS professionalSpecialty,
  pr.area_trabajo AS professionalArea
`;

function addMinutesSql(startColumn, durationColumn = "rc.duracion_minutos") {
  return `ADDTIME(${startColumn}, SEC_TO_TIME(${durationColumn} * 60))`;
}

function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

function appointmentEnd(startTime, durationMinutes) {
  return toTime(toMinutes(startTime) + durationMinutes);
}

function slotRange(startTime, durationMinutes) {
  const slots = [];
  for (let minutes = toMinutes(startTime); minutes < toMinutes(startTime) + durationMinutes; minutes += 15) {
    slots.push(toTime(minutes));
  }
  return slots;
}

export async function listAppointments(filters = {}) {
  const pool = await getPool();
  const where = [];
  const params = [];
  if (filters.date) {
    where.push("rc.fecha_reserva = ?");
    params.push(filters.date);
  }
  if (filters.professionalId) {
    where.push("rc.profesional_id = ?");
    params.push(filters.professionalId);
  }
  if (filters.patientId) {
    where.push("rc.paciente_id = ?");
    params.push(filters.patientId);
  }

  const [rows] = await pool.execute(`
    SELECT ${selectColumns},
      TIME_FORMAT(${addMinutesSql("rc.hora_inicio")}, '%H:%i') AS endTime
    FROM reservas_citas rc
    INNER JOIN pacientes p ON p.id = rc.paciente_id
    INNER JOIN profesionales pr ON pr.id = rc.profesional_id
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY rc.fecha_reserva DESC, rc.hora_inicio ASC, rc.id DESC
  `, params);
  return rows;
}

export async function findAppointment(id, connection) {
  const executor = connection || await getPool();
  const [rows] = await executor.execute(`
    SELECT ${selectColumns},
      TIME_FORMAT(${addMinutesSql("rc.hora_inicio")}, '%H:%i') AS endTime
    FROM reservas_citas rc
    INNER JOIN pacientes p ON p.id = rc.paciente_id
    INNER JOIN profesionales pr ON pr.id = rc.profesional_id
    WHERE rc.id = ?
  `, [id]);
  return rows[0];
}

export async function listAvailableSlots({ professionalId, date, durationMinutes, excludeAppointmentId = null }) {
  const pool = await getPool();
  const [scheduleRows] = await pool.execute(`
    SELECT TIME_FORMAT(hora_inicio, '%H:%i') AS startTime
    FROM horarios_profesionales
    WHERE profesional_id = ? AND dia_semana = WEEKDAY(?) + 1
    ORDER BY hora_inicio
  `, [professionalId, date]);
  const scheduled = new Set(scheduleRows.map((row) => row.startTime));

  const [appointmentRows] = await pool.execute(`
    SELECT
      TIME_FORMAT(hora_inicio, '%H:%i') AS startTime,
      duracion_minutos AS durationMinutes
    FROM reservas_citas
    WHERE profesional_id = ?
      AND fecha_reserva = ?
      AND estado IN (${activeStatuses.map(() => "?").join(", ")})
      ${excludeAppointmentId ? "AND id <> ?" : ""}
  `, excludeAppointmentId ? [professionalId, date, ...activeStatuses, excludeAppointmentId] : [professionalId, date, ...activeStatuses]);

  const occupied = new Set();
  appointmentRows.forEach((appointment) => {
    slotRange(appointment.startTime, appointment.durationMinutes).forEach((slot) => occupied.add(slot));
  });

  return [...scheduled]
    .filter((startTime) => {
      const requiredSlots = slotRange(startTime, durationMinutes);
      return requiredSlots.every((slot) => scheduled.has(slot) && !occupied.has(slot));
    })
    .map((startTime) => ({
      startTime,
      endTime: appointmentEnd(startTime, durationMinutes),
      durationMinutes,
    }));
}

async function entityState(connection, table, id) {
  const [rows] = await connection.execute(`SELECT estado FROM ${table} WHERE id = ?`, [id]);
  return rows[0]?.estado;
}

async function validateAvailability(connection, appointment, excludeAppointmentId = null) {
  const patientState = await entityState(connection, "pacientes", appointment.patientId);
  if (!patientState) return { code: 404, message: "Paciente no encontrado" };
  if (patientState !== "Activo") return { code: 400, message: "No se puede reservar para un paciente inactivo" };

  const professionalState = await entityState(connection, "profesionales", appointment.professionalId);
  if (!professionalState) return { code: 404, message: "Profesional no encontrado" };
  if (professionalState !== "Activo") return { code: 400, message: "No se puede reservar con un profesional inactivo" };

  const requiredSlots = slotRange(appointment.startTime, appointment.durationMinutes);
  const [scheduleRows] = await connection.execute(`
    SELECT TIME_FORMAT(hora_inicio, '%H:%i') AS startTime
    FROM horarios_profesionales
    WHERE profesional_id = ? AND dia_semana = WEEKDAY(?) + 1
      AND hora_inicio IN (${requiredSlots.map(() => "?").join(", ")})
  `, [appointment.professionalId, appointment.appointmentDate, ...requiredSlots]);
  const scheduled = new Set(scheduleRows.map((row) => row.startTime));
  if (!requiredSlots.every((slot) => scheduled.has(slot))) {
    return { code: 409, message: "La reserva debe estar dentro del horario disponible del profesional" };
  }

  const [overlaps] = await connection.execute(`
    SELECT id
    FROM reservas_citas
    WHERE profesional_id = ?
      AND fecha_reserva = ?
      AND estado IN (${activeStatuses.map(() => "?").join(", ")})
      AND hora_inicio < ?
      AND ${addMinutesSql("hora_inicio", "duracion_minutos")} > ?
      ${excludeAppointmentId ? "AND id <> ?" : ""}
    FOR UPDATE
  `, excludeAppointmentId
    ? [appointment.professionalId, appointment.appointmentDate, ...activeStatuses, appointmentEnd(appointment.startTime, appointment.durationMinutes), appointment.startTime, excludeAppointmentId]
    : [appointment.professionalId, appointment.appointmentDate, ...activeStatuses, appointmentEnd(appointment.startTime, appointment.durationMinutes), appointment.startTime]);

  if (overlaps.length) return { code: 409, message: "El profesional ya tiene una reserva activa en ese horario" };
  return null;
}

export async function createAppointment(appointment) {
  const pool = await getPool();
  const connection = await pool.getConnection();
  try {
    await connection.execute("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
    await connection.beginTransaction();
    const availabilityError = await validateAvailability(connection, appointment);
    if (availabilityError) {
      await connection.rollback();
      return { error: availabilityError };
    }
    const [result] = await connection.execute(`
      INSERT INTO reservas_citas (
        paciente_id, profesional_id, fecha_reserva, hora_inicio,
        duracion_minutos, tipo_atencion, estado, motivo, observaciones
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      appointment.patientId,
      appointment.professionalId,
      appointment.appointmentDate,
      appointment.startTime,
      appointment.durationMinutes,
      appointment.appointmentType,
      appointment.estado || "Reservada",
      appointment.motivo || null,
      appointment.observaciones || null,
    ]);
    const created = await findAppointment(result.insertId, connection);
    await connection.commit();
    return { appointment: created };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateAppointment(id, appointment) {
  const pool = await getPool();
  const connection = await pool.getConnection();
  try {
    await connection.execute("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE");
    await connection.beginTransaction();
    const current = await findAppointment(id, connection);
    if (!current) {
      await connection.rollback();
      return { error: { code: 404, message: "Reserva no encontrada" } };
    }

    if (appointment.estado !== "Cancelada" && appointment.estado !== "No asiste") {
      const availabilityError = await validateAvailability(connection, appointment, id);
      if (availabilityError) {
        await connection.rollback();
        return { error: availabilityError };
      }
    }

    await connection.execute(`
      UPDATE reservas_citas
      SET paciente_id = ?, profesional_id = ?, fecha_reserva = ?, hora_inicio = ?,
          duracion_minutos = ?, tipo_atencion = ?, estado = ?, motivo = ?, observaciones = ?
      WHERE id = ?
    `, [
      appointment.patientId,
      appointment.professionalId,
      appointment.appointmentDate,
      appointment.startTime,
      appointment.durationMinutes,
      appointment.appointmentType,
      appointment.estado,
      appointment.motivo || null,
      appointment.observaciones || null,
      id,
    ]);
    const updated = await findAppointment(id, connection);
    await connection.commit();
    return { appointment: updated };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function cancelAppointment(id) {
  const pool = await getPool();
  const [result] = await pool.execute(`
    UPDATE reservas_citas
    SET estado = 'Cancelada'
    WHERE id = ?
  `, [id]);
  if (!result.affectedRows) return null;
  return findAppointment(id);
}
