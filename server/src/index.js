import cors from "cors";
import express from "express";
import "dotenv/config";
import patientRoutes from "./patientRoutes.js";
import professionalRoutes from "./professionalRoutes.js";
import studentRoutes from "./studentRoutes.js";
import scheduleRoutes from "./scheduleRoutes.js";
import studentScheduleRoutes from "./studentScheduleRoutes.js";
import fingerprintRoutes from "./fingerprintRoutes.js";
import odontogramRoutes from "./odontogramRoutes.js";
import periodontogramRoutes from "./periodontogramRoutes.js";
import appointmentRoutes from "./appointmentRoutes.js";

const app = express();
const port = Number(process.env.PORT || 3001);

app.use(cors());
app.use(express.json());
app.get("/api/salud", (_request, response) => response.json({ status: "ok" }));
app.use("/api/pacientes", patientRoutes);
app.use("/api/profesionales", professionalRoutes);
app.use("/api/alumnos", studentRoutes);
app.use("/api/horarios", scheduleRoutes);
app.use("/api/horarios-alumnos", studentScheduleRoutes);
app.use("/api/huellas-profesionales", fingerprintRoutes);
app.use("/api/odontogramas", odontogramRoutes);
app.use("/api/periodontogramas", periodontogramRoutes);
app.use("/api/reservas", appointmentRoutes);

app.use((error, _request, response, _next) => {
  console.error(error);
  if (error.code === "ER_DUP_ENTRY") {
    return response.status(409).json({ message: "Ya existe un registro con ese RUT" });
  }
  return response.status(500).json({ message: "Ocurrio un error interno al procesar la solicitud" });
});

app.listen(port, () => {
  console.log(`API disponible en http://localhost:${port}`);
});
