import { emptyPatient, validatePatient } from "./patient";

export const emptyProfessional = {
  ...emptyPatient,
  tipoPersonal: "Salud",
  areaTrabajo: "",
  especialidad: "",
};

export function validateProfessional(professional) {
  const errors = validatePatient(professional);
  if (!professional.tipoPersonal) errors.tipoPersonal = "Selecciona una opcion";
  if (!professional.areaTrabajo.trim()) errors.areaTrabajo = "Campo obligatorio";
  if (professional.tipoPersonal === "Salud" && !professional.especialidad.trim()) {
    errors.especialidad = "Campo obligatorio para personal de salud";
  }
  return errors;
}
