-- ═══════════════════════════════════════════════════════════════
-- SEED MEDICAMENTOS — RanchoDigital
-- 50 medicamentos veterinarios realistas
-- Reemplaza TU_USER_ID_AQUI con tu UUID de Supabase Auth
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  uid UUID := '34c5e360-fa72-4897-a1f8-b75ce3b5f01a';
BEGIN

INSERT INTO medicamentos (user_id, nombre, tipo, unidad, cantidad_disponible, cantidad_minima, descripcion) VALUES
-- MEDICAMENTOS
(uid, 'Ivermectina 1%',           'Medicamento',    'ml',      450,  50,  'Antiparasitario de amplio espectro. Dosis: 1ml/50kg SC'),
(uid, 'Oxitetraciclina 200mg/ml', 'Medicamento',    'ml',      300,  50,  'Antibiótico de amplio espectro. Dosis: 10mg/kg IM'),
(uid, 'Penicilina G Procaínica',  'Medicamento',    'ml',      200,  30,  'Antibiótico. Dosis: 10,000 UI/kg IM cada 24h'),
(uid, 'Enrofloxacina 10%',        'Medicamento',    'ml',      150,  25,  'Fluoroquinolona. Dosis: 2.5mg/kg SC una vez al día'),
(uid, 'Florfenicol 300mg/ml',     'Medicamento',    'ml',      180,  30,  'Antibiótico. Dosis: 20mg/kg SC cada 48h'),
(uid, 'Dexametasona 2mg/ml',      'Medicamento',    'ml',      120,  20,  'Corticoesteroide antiinflamatorio. Dosis: 0.1mg/kg IM'),
(uid, 'Meloxicam 20mg/ml',        'Medicamento',    'ml',      100,  15,  'AINE. Dosis: 0.5mg/kg SC una vez al día'),
(uid, 'Ketoprofeno 10%',          'Medicamento',    'ml',       80,  15,  'AINE. Dosis: 3mg/kg IM una vez al día'),
(uid, 'Sulfato de Magnesio 50%',  'Medicamento',    'ml',      500,  50,  'Tratamiento de hipocalcemia/hipomagnesemia IV lento'),
(uid, 'Calcio Gluconato 23%',     'Medicamento',    'ml',      400,  50,  'Tratamiento de fiebre de leche. IV lento 500ml'),
(uid, 'Furosemida 50mg/ml',       'Medicamento',    'ml',       60,  10,  'Diurético. Dosis: 0.5-1mg/kg IM o IV'),
(uid, 'Atropina 1mg/ml',          'Medicamento',    'ml',       40,   5,  'Anticolinérgico. Dosis: 0.02-0.04mg/kg SC o IM'),
(uid, 'Xilacina 20mg/ml',         'Medicamento',    'ml',       50,  10,  'Sedante/analgésico. Dosis: 0.05-0.1mg/kg IM'),
(uid, 'Lidocaína 2%',             'Medicamento',    'ml',      200,  30,  'Anestésico local. Infiltración local según necesidad'),
(uid, 'Oxitocina 10 UI/ml',       'Medicamento',    'ml',      100,  15,  'Hormona. Dosis: 20-40 UI IM para retención placentaria'),

-- VACUNAS
(uid, 'Vacuna Triple Bovina',     'Vacuna',         'dosis',   120,  20,  'IBR-BVD-PI3. Aplicar 2ml SC. Revacunar anualmente'),
(uid, 'Vacuna Carbón Sintomático','Vacuna',         'dosis',    80,  15,  'Clostridium chauvoei. 2ml SC. Revacunar cada 6 meses'),
(uid, 'Vacuna Brucelosis RB51',   'Vacuna',         'dosis',    60,  10,  'Solo hembras 4-8 meses. 2ml SC. Dosis única'),
(uid, 'Vacuna Leptospirosis',     'Vacuna',         'dosis',    90,  15,  '2ml SC. Revacunar cada 6 meses'),
(uid, 'Vacuna Rabia Bovina',      'Vacuna',         'dosis',    50,  10,  '2ml SC. Revacunar anualmente en zonas endémicas'),
(uid, 'Vacuna Aftosa Bivalente',  'Vacuna',         'dosis',   200,  30,  '2ml SC. Obligatoria. Revacunar cada 6 meses'),
(uid, 'Vacuna Pasteurelosis',     'Vacuna',         'dosis',    70,  10,  '2ml SC. Revacunar anualmente'),
(uid, 'Vacuna Anaplasmosis',      'Vacuna',         'dosis',    45,  10,  '2ml SC. Revacunar cada 6 meses en zonas endémicas'),

-- VITAMINAS
(uid, 'Vitamina ADE Injectable',  'Vitamina',       'ml',      350,  40,  'Vitaminas liposolubles. Dosis: 5ml IM cada 3 meses'),
(uid, 'Complejo B Inyectable',    'Vitamina',       'ml',      280,  30,  'Vitaminas del grupo B. Dosis: 10ml IM'),
(uid, 'Vitamina E + Selenio',     'Vitamina',       'ml',      160,  20,  'Prevención de miopatía nutricional. 1ml/50kg SC'),
(uid, 'Vitamina C 200mg/ml',      'Vitamina',       'ml',      120,  15,  'Antioxidante. Dosis: 5-10ml IM en estrés o enfermedad'),
(uid, 'Biotina 2mg/ml',           'Vitamina',       'ml',       80,  10,  'Mejora calidad de pezuñas. 10ml IM mensual'),
(uid, 'Vitamina D3 500,000 UI',   'Vitamina',       'ml',      100,  15,  'Prevención raquitismo. 1ml/100kg IM cada 3 meses'),

-- ANTIPARASITARIOS
(uid, 'Albendazol 10%',           'Antiparasitario','ml',      600,  60,  'Antihelmíntico. Dosis: 7.5mg/kg oral. No usar en gestación'),
(uid, 'Levamisol 15%',            'Antiparasitario','ml',      400,  40,  'Antihelmíntico. Dosis: 7.5mg/kg SC'),
(uid, 'Closantel 10%',            'Antiparasitario','ml',      250,  30,  'Fasciolicida. Dosis: 10mg/kg SC. Eficaz contra fasciola'),
(uid, 'Doramectina 1%',           'Antiparasitario','ml',      300,  35,  'Endectocida. Dosis: 1ml/33kg SC. Efecto prolongado'),
(uid, 'Moxidectina 1%',           'Antiparasitario','ml',      200,  25,  'Endectocida. Dosis: 1ml/50kg SC'),
(uid, 'Triclabendazol 10%',       'Antiparasitario','ml',      180,  20,  'Fasciolicida. Dosis: 12mg/kg oral. Eficaz en todos los estadios'),
(uid, 'Nitroxinil 34%',           'Antiparasitario','ml',      150,  20,  'Fasciolicida. Dosis: 10mg/kg SC'),
(uid, 'Deltametrina 1%',          'Antiparasitario','ml',      500,  50,  'Ectoparasiticida. Dosis: 10ml/100kg pour-on'),
(uid, 'Cipermetrina 20%',         'Antiparasitario','ml',      400,  40,  'Ectoparasiticida. Diluir 1:10 para baño o aspersión'),
(uid, 'Amitraz 12.5%',            'Antiparasitario','ml',      300,  30,  'Acaricida. Diluir 1:1000 para baño. Control de garrapatas'),

-- MINERALES
(uid, 'Sulfato de Zinc 36%',      'Mineral',        'ml',      200,  25,  'Prevención y tratamiento de dermatitis digital. 10ml IM'),
(uid, 'Calcio-Fósforo-Magnesio',  'Mineral',        'ml',      350,  40,  'Suplemento mineral inyectable. 10ml IM mensual'),
(uid, 'Hierro Dextrano 200mg/ml', 'Mineral',        'ml',      150,  20,  'Tratamiento anemia ferropénica. 1ml/10kg IM'),
(uid, 'Cobre Inyectable',         'Mineral',        'ml',      100,  15,  'Prevención deficiencia de cobre. 1ml/50kg SC'),
(uid, 'Yodo Orgánico',            'Mineral',        'ml',      120,  15,  'Suplemento de yodo. 1ml/100kg IM cada 3 meses'),
(uid, 'Selenio Inyectable',       'Mineral',        'ml',       90,  10,  'Prevención miopatía nutricional. 1ml/50kg SC'),
(uid, 'Cobalto-Vitamina B12',     'Mineral',        'ml',      130,  15,  'Prevención deficiencia de cobalto. 5ml IM mensual'),
(uid, 'Zinc-Manganeso-Cobre',     'Mineral',        'ml',      160,  20,  'Oligoelementos. 5ml IM mensual para reproductores'),
(uid, 'Fósforo Orgánico 20%',     'Mineral',        'ml',      200,  25,  'Tratamiento hipofosfatemia. 10ml IM o IV lento'),
(uid, 'Magnesio Inyectable 25%',  'Mineral',        'ml',      180,  20,  'Tratamiento hipomagnesemia. 200ml IV lento');

RAISE NOTICE '✅ 50 medicamentos insertados correctamente';

END $$;
