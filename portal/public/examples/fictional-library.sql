-- Fictional schema for Utilibre's drawDB and ChartDB guides. No records or credentials.
-- Esquema ficticio para las guías de drawDB y ChartDB. Sin registros ni credenciales.
CREATE TABLE authors (
  id INTEGER PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);
CREATE TABLE books (
  id INTEGER PRIMARY KEY,
  author_id INTEGER NOT NULL,
  title VARCHAR(200),
  FOREIGN KEY (author_id) REFERENCES authors(id)
);
