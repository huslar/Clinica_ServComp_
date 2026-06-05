USE gestion_clinica;

CREATE TABLE IF NOT EXISTS huellas_profesionales (
  id                       INT UNSIGNED NOT NULL AUTO_INCREMENT,
  profesional_id           INT UNSIGNED NOT NULL,
  plantilla_cifrada        VARBINARY(16384) NOT NULL,
  vector_inicializacion    BINARY(12) NOT NULL,
  etiqueta_autenticacion   BINARY(16) NOT NULL,
  resumen_plantilla        BINARY(32) NOT NULL,
  formato                  ENUM('ANSI_378', 'ISO_19794_2', 'DPFP_PROPRIETARY') NOT NULL,
  calidad                  TINYINT UNSIGNED NOT NULL,
  dispositivo              VARCHAR(100) NOT NULL,
  fecha_enrolamiento       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_huella_profesional (profesional_id),
  UNIQUE KEY uq_huella_resumen (resumen_plantilla),
  CONSTRAINT fk_huella_profesional
    FOREIGN KEY (profesional_id) REFERENCES profesionales (id)
    ON DELETE CASCADE,
  CONSTRAINT ck_huella_calidad CHECK (calidad BETWEEN 0 AND 100)
) ENGINE = InnoDB;

ALTER TABLE huellas_profesionales
  MODIFY COLUMN formato ENUM('ANSI_378', 'ISO_19794_2', 'DPFP_PROPRIETARY') NOT NULL;
