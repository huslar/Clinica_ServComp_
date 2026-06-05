import { Router } from "express";
import {
  createProfessional,
  findProfessionalByRut,
  listProfessionals,
  removeProfessional,
  updateProfessional,
} from "./professionalRepository.js";

const router = Router();
const states = new Set(["Activo", "Inactivo"]);
const staffTypes = new Set(["Salud", "Administracion"]);

function validate(professional) {
  const required = [
    "rut", "nombres", "apellidoPaterno", "apellidoMaterno", "fechaNacimiento",
    "estadoCivil", "genero", "direccion", "comuna", "movil", "correo",
    "profesion", "tipoPersonal", "areaTrabajo", "estado",
  ];
  if (required.some((field) => !String(professional[field] || "").trim())) return "Todos los campos obligatorios deben estar completos";
  if (!states.has(professional.estado)) return "El estado informado no es valido";
  if (!staffTypes.has(professional.tipoPersonal)) return "El tipo de personal no es valido";
  if (professional.tipoPersonal === "Salud" && !String(professional.especialidad || "").trim()) return "La especialidad es obligatoria para profesionales de la salud";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(professional.correo)) return "El correo informado no es valido";
  return null;
}

router.get("/", async (_request, response, next) => {
  try {
    response.json(await listProfessionals());
  } catch (error) {
    next(error);
  }
});

router.get("/rut/:rut", async (request, response, next) => {
  try {
    const professional = await findProfessionalByRut(request.params.rut);
    if (!professional) return response.status(404).json({ message: "Profesional no encontrado" });
    return response.json(professional);
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const message = validate(request.body);
    if (message) return response.status(400).json({ message });
    return response.status(201).json(await createProfessional(request.body));
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (request, response, next) => {
  try {
    const message = validate(request.body);
    if (message) return response.status(400).json({ message });
    const professional = await updateProfessional(Number(request.params.id), request.body);
    if (!professional) return response.status(404).json({ message: "Profesional no encontrado" });
    return response.json(professional);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (request, response, next) => {
  try {
    if (!await removeProfessional(Number(request.params.id))) {
      return response.status(404).json({ message: "Profesional no encontrado" });
    }
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
