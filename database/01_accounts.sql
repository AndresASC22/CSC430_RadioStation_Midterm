-- Waveform Radio: authentication tables for MySQL 8.0.16+
-- Safe to run alongside the five radio station tables from CSC 430 Lab 4.
-- Run this in MySQL Workbench with a schema-creation account.

CREATE DATABASE IF NOT EXISTS radio_station_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE radio_station_db;

CREATE TABLE IF NOT EXISTS users (
  user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('listener', 'admin') NOT NULL DEFAULT 'listener',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sessions (
  session_id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  session_token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at DATETIME(6) NOT NULL,
  CONSTRAINT fk_session_user FOREIGN KEY (user_id)
    REFERENCES users(user_id) ON DELETE CASCADE,
  INDEX idx_sessions_user (user_id),
  INDEX idx_sessions_expiry (expires_at)
) ENGINE=InnoDB;

SHOW TABLES;
DESCRIBE users;
DESCRIBE sessions;
