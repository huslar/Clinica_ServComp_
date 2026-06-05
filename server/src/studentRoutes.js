import { Router } from "express";
import {
  createStudent,
  findStudentByRut,
  listStudents,
  removeStudent,
  updateStudent,
} from "./studentRepository.js";

const router = Router();
const states = new Set(["Activo", "Inactivo"]);

function validate(student) {
  const required = [
    "rut", "nombres", "apellidoPaterno", "apellidoMaterno", "fechaNacimiento",
    "estadoCivil", "genero", "direccion", "comuna", "movil", "correo",
    "profesion", "carreraEspecialidad", "anioCursa", "categoria", "estado",
  ];
  if (required.some((field) => !String(student[field] || "").trim())) return "Todos los campos obligatorios deben estar completos";
  if (!states.has(student.estado)) return "El estado informado no es valido";
  if (!Number.isInteger(Number(student.anioCursa)) || Number(student.anioCursa) < 1 || Number(student.anioCursa) > 10) return "El año que cursa no es valido";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student.correo)) return "El correo informado no es valido";
  return null;
}

router.get("/", async (_request, response, next) => {
  try {
    response.json(await listStudents());
  } catch (error) {
    next(error);
  }
});

router.get("/rut/:rut", async (request, response, next) => {
  try {
    const student = await findStudentByRut(request.params.rut);
    if (!student) return response.status(404).json({ message: "Alumno no encontrado" });
    return response.json(student);
  } catch (error) {
    return next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const message = validate(request.body);
    if (message) return response.status(400).json({ message });
    return response.status(201).json(await createStudent(request.body));
  } catch (error) {
    return next(error);
  }
});

router.put("/:id", async (request, response, next) => {
  try {
    const message = validate(request.body);
    if (message) return response.status(400).json({ message });
    const student = await updateStudent(Number(request.params.id), request.body);
    if (!student) return response.status(404).json({ message: "Alumno no encontrado" });
    return response.json(student);
  } catch (error) {
    return next(error);
  }
});

router.delete("/:id", async (request, response, next) => {
  try {
    if (!await removeStudent(Number(request.params.id))) {
      return response.status(404).json({ message: "Alumno no encontrado" });
    }
    return response.status(204).send();
  } catch (error) {
    return next(error);
  }
});

export default router;
