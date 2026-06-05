USE gestion_clinica;

CREATE TABLE IF NOT EXISTS periodontograma_registros (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  paciente_id           INT UNSIGNED NOT NULL,
  diagnostico           TEXT NULL,
  planificacion         TEXT NULL,
  seguimiento           TEXT NULL,
  actor                 VARCHAR(120) NOT NULL DEFAULT 'Sistema',
  fecha_registro        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_periodontograma_paciente_fecha (paciente_id, fecha_registro),
  CONSTRAINT fk_periodontograma_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
    ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS periodontograma_mediciones (
  id                     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  registro_id            INT UNSIGNED NOT NULL,
  pieza                  VARCHAR(2) NOT NULL,
  sitio                  VARCHAR(3) NOT NULL,
  profundidad_sondaje_mm TINYINT UNSIGNED NOT NULL,
  margen_gingival_mm     SMALLINT NOT NULL,
  sangrado               TINYINT(1) NOT NULL DEFAULT 0,
  supuracion             TINYINT(1) NOT NULL DEFAULT 0,
  placa                  TINYINT(1) NOT NULL DEFAULT 0,
  furcacion              TINYINT(1) NOT NULL DEFAULT 0,
  implante               TINYINT(1) NOT NULL DEFAULT 0,
  movilidad              TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_periodontograma_registro_sitio (registro_id, pieza, sitio),
  KEY ix_periodontograma_pieza (pieza),
  CONSTRAINT fk_periodontograma_medicion_registro
    FOREIGN KEY (registro_id) REFERENCES periodontograma_registros (id)
    ON DELETE CASCADE,
  CONSTRAINT ck_periodontograma_sitio CHECK (sitio IN ('MV', 'V', 'DV', 'MP', 'P', 'DP')),
  CONSTRAINT ck_periodontograma_sondaje CHECK (profundidad_sondaje_mm BETWEEN 0 AND 15),
  CONSTRAINT ck_periodontograma_margen CHECK (margen_gingival_mm BETWEEN -15 AND 15),
  CONSTRAINT ck_periodontograma_movilidad CHECK (movilidad BETWEEN 0 AND 3)
) ENGINE = InnoDB;

ALTER TABLE periodontograma_mediciones
  ADD COLUMN IF NOT EXISTS placa TINYINT(1) NOT NULL DEFAULT 0 AFTER supuracion,
  ADD COLUMN IF NOT EXISTS furcacion TINYINT(1) NOT NULL DEFAULT 0 AFTER placa,
  ADD COLUMN IF NOT EXISTS implante TINYINT(1) NOT NULL DEFAULT 0 AFTER furcacion;
