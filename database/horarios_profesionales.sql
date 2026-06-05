USE gestion_clinica;

CREATE TABLE IF NOT EXISTS horarios_profesionales (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  profesional_id  INT UNSIGNED NOT NULL,
  dia_semana      TINYINT UNSIGNED NOT NULL,
  hora_inicio     TIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_horario_profesional_modulo (profesional_id, dia_semana, hora_inicio),
  KEY ix_horarios_profesional (profesional_id),
  CONSTRAINT fk_horarios_profesional
    FOREIGN KEY (profesional_id) REFERENCES profesionales (id)
    ON DELETE CASCADE,
  CONSTRAINT ck_horarios_dia CHECK (dia_semana BETWEEN 1 AND 7),
  CONSTRAINT ck_horarios_cuarto_hora CHECK (MINUTE(hora_inicio) IN (0, 15, 30, 45))
) ENGINE = InnoDB;
