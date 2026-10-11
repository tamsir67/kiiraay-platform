-- =====================================================================
-- KIIRAAY — Génération du référentiel géographique INDICATIF de Guédiawaye
-- ---------------------------------------------------------------------
-- Les limites ci-dessous sont SCHÉMATIQUES (cf. CDC §9 : « sous réserve de
-- la validation des limites géographiques »). Elles servent à initialiser la
-- plateforme et à faire fonctionner la carte. Elles doivent être remplacées
-- par les limites officielles (ANAT / collectivités) validées par le comité
-- de pilotage via l'écran Territoires > Import GeoJSON ou `npm run geo:import`.
--
-- Usage : psql -d kiiraay -At -f tools/build-geo.sql > shared/geo/guediawaye.json
-- =====================================================================
WITH pts AS (
  SELECT * FROM (VALUES
    ('A', -17.4250, 14.7750), ('B', -17.4080, 14.7920), ('C', -17.3900, 14.8000),
    ('D', -17.3700, 14.8060), ('E', -17.3600, 14.7900), ('F', -17.3620, 14.7720),
    ('G', -17.3720, 14.7580), ('P', -17.3850, 14.7570), ('H', -17.3950, 14.7550),
    ('I', -17.4150, 14.7600), ('J', -17.4000, 14.7750), ('K', -17.3850, 14.7820),
    ('L', -17.3800, 14.7680), ('M', -17.3920, 14.7900)
  ) AS t(k, x, y)
),
communes_def AS (
  SELECT * FROM (VALUES
    ('GS', 'Golf Sud',              ARRAY['I','A','J','M','K','L','P','H','I'], 12, 101),
    ('SN', 'Sam Notaire',           ARRAY['B','C','K','M','B'],                  8, 202),
    ('NL', 'Ndiarème Limamoulaye',  ARRAY['C','D','E','L','K','C'],              9, 303),
    ('WN', 'Wakhinane Nimzatt',     ARRAY['A','B','M','J','A'],                  9, 404),
    ('MG', 'Médina Gounass',        ARRAY['L','E','F','G','P','L'],              8, 505)
  ) AS t(code, nom, ring, nq, seed)
),
communes AS (
  SELECT c.code, c.nom, c.nq, c.seed,
         ST_SetSRID(ST_MakePolygon(ST_MakeLine(ARRAY(
           SELECT ST_MakePoint(p.x, p.y)
           FROM unnest(c.ring) WITH ORDINALITY AS r(k, o)
           JOIN pts p ON p.k = r.k ORDER BY r.o))), 4326) AS geom
  FROM communes_def c
),
-- Découpage des communes en quartiers : diagramme de Voronoï de points
-- pseudo-aléatoires (graine fixe => résultat reproductible), découpé par la commune.
seeds AS (
  SELECT c.code, (ST_Dump(ST_GeneratePoints(c.geom, c.nq, c.seed))).geom AS pt FROM communes c
),
cells AS (
  SELECT c.code,
         ST_Intersection(c.geom, (ST_Dump(ST_VoronoiPolygons(ST_Collect(s.pt), 0, ST_Expand(c.geom, 0.01)))).geom) AS geom
  FROM communes c JOIN seeds s ON s.code = c.code
  GROUP BY c.code, c.geom
),
cells_ordered AS (
  SELECT code, geom,
         row_number() OVER (PARTITION BY code ORDER BY ST_Y(ST_Centroid(geom)) DESC, ST_X(ST_Centroid(geom))) AS rn
  FROM cells WHERE NOT ST_IsEmpty(geom)
),
features AS (
  SELECT json_build_object(
    'type','Feature',
    'properties', json_build_object('niveau','commune','code',code,'nom',nom),
    'geometry', ST_AsGeoJSON(ST_Multi(geom), 6)::json) AS f, 0 AS ord, code AS c, 0 AS rn
  FROM communes
  UNION ALL
  SELECT json_build_object(
    'type','Feature',
    'properties', json_build_object('niveau','quartier','commune',code,'index',rn),
    'geometry', ST_AsGeoJSON(ST_Multi(geom), 6)::json), 1, code, rn
  FROM cells_ordered
)
SELECT json_build_object(
  'type','FeatureCollection',
  'name','guediawaye_indicatif',
  'avertissement','Limites schématiques non officielles - à remplacer par le référentiel validé',
  'features', json_agg(f ORDER BY ord, c, rn))
FROM features;
