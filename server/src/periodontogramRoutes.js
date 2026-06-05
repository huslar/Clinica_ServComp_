import { Router } from "express";
import { getLatestPeriodontogram, patientExists, savePeriodontogram } from "./periodontogramRepository.js";

const router = Router();
const teeth = new Set(["11", "12", "13", "14", "15", "16", "17", "18", "21", "22", "23", "24", "25", "26", "27", "28", "31", "32", "33", "34", "35", "36", "37", "38", "41", "42", "43", "44", "45", "46", "47", "48"]);
const sites = new Set(["MV", "V", "DV", "MP", "P", "DP"]);

router.use((_request, response, next) => {
  response.set("Cache-Control", "no-store");
  next();
});

async function prepare(request, response) {
  const patientId = Number(request.params.patientId);
  if (!Number.isInteger(patientId) || patientId < 1) {
    response.status(400).json({ message: "Paciente no valido" });
    return null;
  }
  if (!await patientExists(patientId)) {
    response.status(404).json({ message: "Paciente no encontrado" });
    return null;
  }
  return patientId;
}

function validatePayload(body) {
  if (!Array.isArray(body.measurements)) return "Las mediciones no tienen un formato valido";
  if (body.measurements.length > 192) return "El periodontograma excede el numero de sitios permitidos";
  if (String(body.diagnosis || "").length > 2000) return "El diagnostico no puede superar 2000 caracteres";
  if (String(body.planning || "").length > 2000) return "La planificacion no puede superar 2000 caracteres";
  if (String(body.followUp || "").length > 2000) return "El seguimiento no puede superar 2000 caracteres";
  const keys = new Set();
  for (const item of body.measurements) {
    if (!teeth.has(String(item.tooth))) return "La pieza dental informada no es valida";
    if (!sites.has(String(item.site))) return "El sitio periodontal informado no es valido";
    const probingDepth = Number(item.probingDepth);
    const gingivalMargin = Number(item.gingivalMargin);
    const mobility = Number(item.mobility);
    if (!Number.isInteger(probingDepth) || probingDepth < 0 || probingDepth > 15) return "La profundidad de sondaje debe estar entre 0 y 15 mm";
    if (!Number.isInteger(gingivalMargin) || gingivalMargin < -15 || gingivalMargin > 15) return "El margen gingival debe estar entre -15 y 15 mm";
    if (!Number.isInteger(mobility) || mobility < 0 || mobility > 3) return "La movilidad dental debe estar entre 0 y 3";
    const key = `${item.tooth}-${item.site}`;
    if (keys.has(key)) return "No se permiten mediciones duplicadas por pieza y sitio";
    keys.add(key);
  }
  return null;
}

router.get("/:patientId", async (request, response, next) => {
  try {
    const patientId = await prepare(request, response);
    if (!patientId) return;
    return response.json(await getLatestPeriodontogram(patientId));
  } catch (error) {
    return next(error);
  }
});

router.post("/:patientId", async (request, response, next) => {
  try {
    const patientId = await prepare(request, response);
    if (!patientId) return;
    const message = validatePayload(request.body);
    if (message) return response.status(400).json({ message });
    const actor = String(request.get("X-Clinical-Actor") || "Sistema").slice(0, 120);
    return response.status(201).json(await savePeriodontogram(patientId, request.body, actor));
  } catch (error) {
    return next(error);
  }
});

export default router;
