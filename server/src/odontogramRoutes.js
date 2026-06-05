import { randomUUID } from "node:crypto";
import { Router } from "express";
import {
  annulFinding,
  appendOdontogramEvent,
  listOdontogram,
  patientExists,
} from "./odontogramRepository.js";

const router = Router();
const dentitions = new Set(["Permanente", "Temporal"]);
const surfaces = new Set(["Completa", "Vestibular", "LingualPalatina", "Mesial", "Distal", "OclusalIncisal"]);
const findingTypes = new Set(["Caries", "Restauracion", "Ausente", "Fractura", "Corona", "Endodoncia", "Implante", "Sellante", "Observacion"]);
const severities = new Set(["Leve", "Moderada", "Severa"]);
const permanentTeeth = new Set(["11", "12", "13", "14", "15", "16", "17", "18", "21", "22", "23", "24", "25", "26", "27", "28", "31", "32", "33", "34", "35", "36", "37", "38", "41", "42", "43", "44", "45", "46", "47", "48"]);
const temporaryTeeth = new Set(["51", "52", "53", "54", "55", "61", "62", "63", "64", "65", "71", "72", "73", "74", "75", "81", "82", "83", "84", "85"]);

router.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

function context(request) {
  const actor = String(request.get("X-Clinical-Actor") || "").trim();
  if (!actor || actor.length > 120) return null;
  return { actor, source: "web", requestId: randomUUID() };
}

function validTooth(dentition, tooth) {
  if (!dentitions.has(dentition)) return false;
  return (dentition === "Permanente" ? permanentTeeth : temporaryTeeth).has(tooth);
}

function validateFinding(body) {
  if (!validTooth(body.dentition, body.tooth)) return "La pieza dental informada no es valida";
  if (!surfaces.has(body.surface)) return "La superficie dental informada no es valida";
  if (!findingTypes.has(body.findingType)) return "El tipo de hallazgo no es valido";
  if (!severities.has(body.severity)) return "La severidad informada no es valida";
  if (String(body.clinicalNote || "").length > 500) return "La nota clinica no puede superar 500 caracteres";
  return null;
}

async function prepare(request, response) {
  const patientId = Number(request.params.patientId);
  if (!Number.isInteger(patientId) || patientId < 1) {
    response.status(400).json({ message: "Paciente no valido" });
    return null;
  }
  const auditContext = context(request);
  if (!auditContext) {
    response.status(401).json({ message: "No fue posible identificar al usuario clinico" });
    return null;
  }
  if (!await patientExists(patientId)) {
    response.status(404).json({ message: "Paciente no encontrado" });
    return null;
  }
  return { patientId, auditContext };
}

router.get("/:patientId", async (request, response, next) => {
  try {
    const prepared = await prepare(request, response);
    if (!prepared) return;
    await appendOdontogramEvent(prepared.patientId, { eventType: "ODONTOGRAMA_CONSULTADO" }, prepared.auditContext);
    return response.json(await listOdontogram(prepared.patientId));
  } catch (error) {
    return next(error);
  }
});

router.post("/:patientId/interacciones", async (request, response, next) => {
  try {
    const prepared = await prepare(request, response);
    if (!prepared) return;
    if (request.body.action !== "PIEZA_SELECCIONADA" || !validTooth(request.body.dentition, request.body.tooth)) {
      return response.status(400).json({ message: "La interaccion informada no es valida" });
    }
    await appendOdontogramEvent(prepared.patientId, {
      eventType: "PIEZA_SELECCIONADA",
      dentition: request.body.dentition,
      tooth: request.body.tooth,
    }, prepared.auditContext);
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
});

router.post("/:patientId/hallazgos", async (request, response, next) => {
  try {
    const prepared = await prepare(request, response);
    if (!prepared) return;
    const message = validateFinding(request.body);
    if (message) return response.status(400).json({ message });
    await appendOdontogramEvent(prepared.patientId, {
      eventType: "HALLAZGO_REGISTRADO",
      dentition: request.body.dentition,
      tooth: request.body.tooth,
      surface: request.body.surface,
      findingType: request.body.findingType,
      severity: request.body.severity,
      clinicalNote: String(request.body.clinicalNote || "").trim(),
    }, prepared.auditContext);
    return response.status(201).json(await listOdontogram(prepared.patientId));
  } catch (error) {
    return next(error);
  }
});

router.post("/:patientId/hallazgos/:findingId/anular", async (request, response, next) => {
  try {
    const prepared = await prepare(request, response);
    if (!prepared) return;
    const findingId = Number(request.params.findingId);
    const reason = String(request.body.reason || "").trim();
    if (!Number.isInteger(findingId) || findingId < 1) return response.status(400).json({ message: "Hallazgo no valido" });
    if (reason.length < 5 || reason.length > 500) return response.status(400).json({ message: "Indica un motivo de anulacion entre 5 y 500 caracteres" });
    if (!await annulFinding(prepared.patientId, findingId, reason, prepared.auditContext)) {
      return response.status(404).json({ message: "Hallazgo vigente no encontrado" });
    }
    return response.json(await listOdontogram(prepared.patientId));
  } catch (error) {
    return next(error);
  }
});

export default router;
