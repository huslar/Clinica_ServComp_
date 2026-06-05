import { Router } from "express";
import { getPool } from "./db.js";
import { listScheduleBlocks, replaceScheduleBlocks } from "./scheduleRepository.js";

const router = Router();
const timePattern = /^([01]\d|2[0-3]):(00|15|30|45)$/;

async function professionalExists(id) {
  const pool = await getPool();
  const [rows] = await pool.execute("SELECT id FROM profesionales WHERE id = ?", [id]);
  return Boolean(rows[0]);
}

function validateBlocks(blocks) {
  if (!Array.isArray(blocks)) return "El formato de horarios no es valido";
  const keys = new Set();
  for (const block of blocks) {
    if (!Number.isInteger(block.dayOfWeek) || block.dayOfWeek < 1 || block.dayOfWeek > 7) return "El dia informado no es valido";
    if (!timePattern.test(block.startTime)) return "Los horarios deben utilizar modulos de 15 minutos";
    const key = `${block.dayOfWeek}-${block.startTime}`;
    if (keys.has(key)) return "No se permiten modulos duplicados";
    keys.add(key);
  }
  return null;
}

router.get("/:professionalId", async (request, response, next) => {
  try {
    const professionalId = Number(request.params.professionalId);
    if (!await professionalExists(professionalId)) return response.status(404).json({ message: "Profesional no encontrado" });
    return response.json(await listScheduleBlocks(professionalId));
  } catch (error) {
    return next(error);
  }
});

router.put("/:professionalId", async (request, response, next) => {
  try {
    const professionalId = Number(request.params.professionalId);
    if (!await professionalExists(professionalId)) return response.status(404).json({ message: "Profesional no encontrado" });
    const message = validateBlocks(request.body.blocks);
    if (message) return response.status(400).json({ message });
    return response.json(await replaceScheduleBlocks(professionalId, request.body.blocks));
  } catch (error) {
    return next(error);
  }
});

export default router;
