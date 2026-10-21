-- Campus Event Hub — MySQL setup
-- Run this once in phpMyAdmin (Import tab) or the MySQL console.

CREATE DATABASE IF NOT EXISTS campus_event_hub;
USE campus_event_hub;

-- Every student registration for an event.
-- event_id matches the "id" field in data/events.json.
CREATE TABLE IF NOT EXISTS registrations (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  event_id      INT          NOT NULL,
  name          VARCHAR(100) NOT NULL,
  reg_no        VARCHAR(20)  NOT NULL,
  email         VARCHAR(100) NOT NULL,
  phone         VARCHAR(15)  NOT NULL,
  department    VARCHAR(60)  NOT NULL,
  year          TINYINT      NOT NULL,
  registered_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  ticket_code   VARCHAR(12)  NOT NULL,             -- shown as a QR code on the student's ticket
  checked_in_at TIMESTAMP    NULL DEFAULT NULL,    -- set when the ticket is scanned at the door
  -- one student can register only once per event
  UNIQUE KEY uniq_event_student (event_id, reg_no),
  -- every ticket code is different
  UNIQUE KEY uniq_ticket (ticket_code)
);

-- Admin accounts for the dashboard. Passwords are stored as hashes.
CREATE TABLE IF NOT EXISTS admins (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50)  NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);

-- Default admin  ->  username: admin   password: admin123
INSERT IGNORE INTO admins (username, password)
VALUES ('admin', '$2y$10$1..8OKJaGXuojVVH/b.C3er0c5.HXLKwY1CJzj.w9TjVuamd08Ahe');

-- A few sample registrations so the admin dashboard is not empty.
INSERT IGNORE INTO registrations (event_id, name, reg_no, email, phone, department, year, ticket_code) VALUES
(1, 'Aarav Mehta',   '2427010101', 'aarav.mehta@example.com',   '9876543210', 'CSE', 3, 'CH-7F3A9C21'),
(1, 'Diya Sharma',   '2427010102', 'diya.sharma@example.com',   '9876543211', 'IT',  2, 'CH-B84E1D07'),
(2, 'Kabir Singh',   '2427010103', 'kabir.singh@example.com',   '9876543212', 'ECE', 1, 'CH-2C6D5F90'),
(3, 'Ananya Gupta',  '2427010104', 'ananya.gupta@example.com',  '9876543213', 'EEE', 2, 'CH-E19A4B36'),
(5, 'Rohan Verma',   '2427010105', 'rohan.verma@example.com',   '9876543214', 'ME',  4, 'CH-5D02C8AF');
