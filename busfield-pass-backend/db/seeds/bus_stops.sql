-- Pontos de ônibus FICTÍCIOS, só para desenvolvimento (região central de Florianópolis).
-- Em produção, importe dados reais (por exemplo, do OpenStreetMap ou do operador de transporte).
INSERT INTO bus_stops (name, latitude, longitude, lines, source) VALUES
  ('Ponto Exemplo 1 – Centro',        -27.59690, -48.54950, ARRAY['101','205'], 'sample'),
  ('Ponto Exemplo 2 – Terminal',      -27.59540, -48.54800, ARRAY['101','330'], 'sample'),
  ('Ponto Exemplo 3 – Praça',         -27.59800, -48.54700, ARRAY[]::text[],    'sample'),
  ('Ponto Exemplo 4 – Avenida',       -27.60100, -48.55200, ARRAY['205'],       'sample'),
  ('Ponto Exemplo 5 – Distante',      -27.65000, -48.50000, ARRAY['330'],       'sample');
