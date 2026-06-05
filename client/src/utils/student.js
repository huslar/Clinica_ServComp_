import { emptyPatient, validatePatient } from "./patient";

export const emptyStudent = {
  ...emptyPatient,
  profesion: "Estudiante",
  carreraEspecialidad: "",
  anioCursa: "",
  categoria: "",
};

export function validateStudent(student) {
  const errors = validatePatient(student);
  if (!student.carreraEspecialidad.trim()) errors.carreraEspecialidad = "Campo obligatorio";
  if (!student.anioCursa || Number(student.anioCursa) < 1 || Number(student.anioCursa) > 10) errors.anioCursa = "Selecciona un año valido";
  if (!student.categoria.trim()) errors.categoria = "Campo obligatorio";
  return errors;
}
