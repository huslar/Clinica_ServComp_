USE gestion_clinica;

CREATE TABLE IF NOT EXISTS reservas_citas (
  id                 INT UNSIGNED NOT NULL AUTO_INCREMENT,
  paciente_id        INT UNSIGNED NOT NULL,
  profesional_id     INT UNSIGNED NOT NULL,
  fecha_reserva      DATE NOT NULL,
  hora_inicio        TIME NOT NULL,
  duracion_minutos   SMALLINT UNSIGNED NOT NULL DEFAULT 30,
  tipo_atencion      ENUM('Diagnostico', 'Control', 'Atencion') NOT NULL,
  estado             ENUM('Reservada', 'Confirmada', 'En espera', 'Atendida', 'Cancelada', 'No asiste') NOT NULL DEFAULT 'Reservada',
  motivo             VARCHAR(250) NULL,
  observaciones      VARCHAR(500) NULL,
  creado_en          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_reservas_fecha_profesional (fecha_reserva, profesional_id, hora_inicio),
  KEY ix_reservas_paciente (paciente_id, fecha_reserva),
  CONSTRAINT fk_reservas_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_reservas_profesional
    FOREIGN KEY (profesional_id) REFERENCES profesionales (id)
    ON DELETE RESTRICT,
  CONSTRAINT ck_reservas_duracion CHECK (duracion_minutos BETWEEN 15 AND 120 AND MOD(duracion_minutos, 15) = 0),
  CONSTRAINT ck_reservas_cuarto_hora CHECK (MINUTE(hora_inicio) IN (0, 15, 30, 45))
) ENGINE = InnoDB;
