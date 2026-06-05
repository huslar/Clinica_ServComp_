import { Router } from "express";
import {
  cancelAppointment,
  createAppointment,
  listAppointments,
  listAvailableSlots,
  updateAppointment,
} from "./appointmentRepository.js";

const router = Router();
const timePattern = /^([01]\d|2[0-3]):(00|15|30|45)$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const appointmentTypes = new Set(["Diagnostico", "Control", "Atencion"]);
const statuses = new Set(["Reservada", "Confirmada", "En espera", "Atendida", "Cancelada", "No asiste"]);
const durations = new Set([15, 30, 45, 60, 75, 90, 120]);

function toInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function validateAppointment(appointment, { partial = false } = {}) {
  const required = ["patientId", "professionalId", "appointmentDate", "startTime", "durationMinutes", "appointmentType", "estado"];
  if (!partial && required.some((field) => appointment[field] === undefined || appointment[field] === null || String(appointment[field]).trim() === "")) {
    return "Todos los campos obligatorios de la reserva deben estar completos";
  }
  if (!Number.isInteger(appointment.patientId) || appointment.patientId <= 0) return "El paciente informado no es valido";
  if (!Number.isInteger(appointment.professionalId) || appointment.professionalId <= 0) return "El profesional informado no es valido";
  if (!datePattern.test(appointment.appointmentDate)) return "La fecha de reserva no es valida";
  if (!timePattern.test(appointment.startTime)) return "La hora debe estar en modulos de 15 minutos";
  if (!durations.has(appointment.durationMinutes)) return "La duracion debe estar entre 15 y 120 minutos en modulos clinicos";
  if (!appointmentTypes.has(appointment.appointmentType)) return "El tipo de reserva debe ser Diagnostico, Control o Atencion";
  if (!statuses.has(appointment.estado)) return "El estado de la reserva no es valido";
  if (String(appointment.motivo || "").length > 250) return "El motivo no puede superar 250 caracteres";
  if (String(appointment.observaciones || "").length > 500) return "Las observaciones no pueden superar 500 caracteres";
  return null;
}

function normalizeAppointment(body) {
  return {
    patientId: toInteger(body.patientId),
    professionalId: toInteger(body.professionalId),
    appointmentDate: String(body.appointmentDate || "").trim(),
    startTime: String(body.startTime || "").trim(),
    durationMinutes: toInteger(body.durationMinutes),
    appointmentType: String(body.appointmentType || "").trim(),
    estado: String(body.estado || "Reservada").trim(),
    motivo: String(body.motivo || "").trim(),
    observaciones: String(body.observaciones || "").trim(),
  };
}

router.get("/", async (request, response, next) => {
  try {
    const filters = {
      date: request.query.date ? String(request.query.date) : undefined,
      professionalId: request.query.professionalId ? toInteger(request.query.professionalId) : undefined,
      patientId: request.query.patientId ? toInteger(request.query.patientId) : undefined,
    };
    return response.json(await listAppointments(filters));
  } catch (error) {
    return next(error);
  }
});

router.get("/disponibilidad", async (request, response, next) => {
  try {
    const professionalId = toInteger(request.query.professionalId);
    const durationMinutes = toInteger(request.query.durationMinutes || 30);
    const date = String(request.query.date || "");
    if (!professionalId || !datePattern.test(date) || !durations.has(durationMinutes)) {
      return response.status(400).json({ message: "Indica profesional, fecha y duracion validos para consultar disponibilidad" });
    }
    return response.json(await listAvailableSlots({ professionalId, date, durationMinutes }));
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const appointment = normalizeAppointment(request.body);
    const message = validateAppointment(appointment);
    if (message) return response.status(400).json({ message });
    const result = await createAppointment(appointment);
    if (result.error) return response.status(result.error.code).json({ message: result.error.message });
    return response.status(201).json(result.appointment);
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (request, response, next) => {
  try {
    const appointment = normalizeAppointment(request.body);
    const message = validateAppointment(appointment);
    if (message) return response.status(400).json({ message });
    const result = await updateAppointment(Number(request.params.id), appointment);
    if (result.error) return response.status(result.error.code).json({ message: result.error.message });
    return response.json(result.appointment);
  } catch (error) {
    return next(error);
  }
});

router.patch("/:id/cancelar", async (request, response, next) => {
  try {
    const appointment = await cancelAppointment(Number(request.params.id));
    if (!appointment) return response.status(404).json({ message: "Reserva no encontrada" });
    return response.json(appointment);
  } catch (error) {
    return next(error);
  }
});

export default router;
