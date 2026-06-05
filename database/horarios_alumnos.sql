USE gestion_clinica;

CREATE TABLE IF NOT EXISTS horarios_alumnos (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  alumno_id    INT UNSIGNED NOT NULL,
  dia_semana   TINYINT UNSIGNED NOT NULL,
  hora_inicio  TIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_horario_alumno_modulo (alumno_id, dia_semana, hora_inicio),
  KEY ix_horarios_alumno (alumno_id),
  CONSTRAINT fk_horarios_alumno
    FOREIGN KEY (alumno_id) REFERENCES alumnos (id)
    ON DELETE CASCADE,
  CONSTRAINT ck_horarios_alumnos_dia CHECK (dia_semana BETWEEN 1 AND 7),
  CONSTRAINT ck_horarios_alumnos_cuarto_hora CHECK (MINUTE(hora_inicio) IN (0, 15, 30, 45))
) ENGINE = InnoDB;
