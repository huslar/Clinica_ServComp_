import { Router } from "express";
import { createPatient, findPatientByRut, listPatients, removePatient, updatePatient } from "./patientRepository.js";

const router = Router();
const states = new Set(["Activo", "Inactivo"]);

function validate(patient) {
  const required = ["rut", "nombres", "apellidoPaterno", "apellidoMaterno", "fechaNacimiento", "estadoCivil", "genero", "direccion", "comuna", "movil", "correo", "profesion", "estado"];
  if (required.some((field) => !String(patient[field] || "").trim())) return "Todos los campos son obligatorios";
  if (!states.has(patient.estado)) return "El estado informado no es valido";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patient.correo)) return "El correo informado no es valido";
  return null;
}

router.get("/", async (_request, response, next) => {
  try {
    response.json(await listPatients());
  } catch (error) {
    next(error);
  }
});

router.get("/rut/:rut", async (request, response, next) => {
  try {
    const patient = await findPatientByRut(request.params.rut);
    if (!patient) return response.status(404).json({ message: "Paciente no encontrado" });
    return response.json(patient);
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const message = validate(request.body);
    if (message) return response.status(400).json({ message });
    return response.status(201).json(await createPatient(request.body));
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (request, response, next) => {
  try {
    const message = validate(request.body);
    if (message) return response.status(400).json({ message });
    const patient = await updatePatient(Number(request.params.id), request.body);
    if (!patient) return response.status(404).json({ message: "Paciente no encontrado" });
    return response.json(patient);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (request, response, next) => {
  try {
    if (!await removePatient(Number(request.params.id))) {
      return response.status(404).json({ message: "Paciente no encontrado" });
    }
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
