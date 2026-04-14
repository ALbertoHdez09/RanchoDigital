-- ═══════════════════════════════════════════════════════════════
-- SEED DATA — RanchoDigital
-- 200 animales + 150 tratamientos en 70 animales
-- Reemplaza TU_USER_ID_AQUI con tu UUID de Supabase Auth
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  uid UUID := '34c5e360-fa72-4897-a1f8-b75ce3b5f01a';

  razas TEXT[] := ARRAY[
    'Brahman','Angus','Hereford','Simmental','Charolais',
    'Limousin','Gyr','Nelore','Suizo Europeo','Beefmaster',
    'Brangus','Senepol','Pardo Suizo','Retinta','Fleckvieh'
  ];
  estados TEXT[] := ARRAY[
    'Becerro / Becerra','Vaquilla','Vientre / Producción',
    'Vaca Seca','Torete / Novillo','Semental'
  ];
  fines TEXT[] := ARRAY[
    'Pie de Cría','Engorda','Doble Propósito','Lechero Especializado'
  ];
  nombres_h TEXT[] := ARRAY[
    'La Pinta','La Manchada','La Negra','La Güera','La Prieta',
    'La Canela','La Estrella','La Luna','La Paloma','La Reina',
    'La Bonita','La Flaca','La Gorda','La Chula','La Brava',
    'La Mansa','La Vieja','La Joven','La Roja','La Blanca',
    'Lupita','Rosita','Conchita','Esperanza','Dolores',
    'Remedios','Soledad','Amparo','Refugio','Concepción'
  ];
  nombres_m TEXT[] := ARRAY[
    'El Toro','El Negro','El Güero','El Prieto','El Canelo',
    'El Bravo','El Manso','El Viejo','El Joven','El Rojo',
    'El Blanco','El Grande','El Chico','El Gordo','El Flaco',
    'Valentín','Cipriano','Abundio','Macario','Eustaquio',
    'Próspero','Celestino','Epifanio','Crisanto','Fulgencio'
  ];

  -- Variables de trabajo
  i INT;
  genero TEXT;
  raza TEXT;
  estado TEXT;
  fin TEXT;
  nombre TEXT;
  arete TEXT;
  peso NUMERIC;
  fecha_nac DATE;
  animal_id UUID;
  animal_ids UUID[] := ARRAY[]::UUID[];

  -- Para tratamientos
  j INT;
  k INT;
  plan_id UUID;
  animal_sel UUID;
  productos TEXT[] := ARRAY[
    'Ivermectina 1%','Oxitetraciclina 200mg','Vitamina ADE',
    'Complejo B','Penicilina G','Enrofloxacina','Florfenicol',
    'Dexametasona','Meloxicam','Albendazol','Levamisol',
    'Closantel','Vacuna Triple','Vacuna Carbón','Vacuna Brucelosis',
    'Vacuna IBR-BVD','Sulfato de Zinc','Calcio-Fósforo','Hierro Dextrano',
    'Selenio + Vitamina E'
  ];
  tipos_prod TEXT[] := ARRAY[
    'Medicamento','Medicamento','Vitamina','Vitamina','Medicamento',
    'Medicamento','Medicamento','Medicamento','Medicamento','Antiparasitario',
    'Antiparasitario','Antiparasitario','Vacuna','Vacuna','Vacuna',
    'Vacuna','Mineral','Mineral','Medicamento','Vitamina'
  ];
  diagnosticos TEXT[] := ARRAY[
    'Control Preventivo','Neumonía','Diarrea neonatal','Mastitis',
    'Timpanismo','Fiebre aftosa preventiva','Desparasitación rutinaria',
    'Deficiencia vitamínica','Brucelosis preventiva','Anaplasmosis',
    'Babesiosis','Queratoconjuntivitis','Retención placentaria',
    'Hipocalcemia','Control de ectoparásitos'
  ];
  fecha_plan DATE;
  dias_trat INT;
  d INT;
  fecha_dosis DATE;
  estado_dosis TEXT;

BEGIN

-- ─── 1. INSERTAR 200 ANIMALES ────────────────────────────────────────────────

FOR i IN 1..200 LOOP
  -- Género: 70% hembras, 30% machos (realista para rancho)
  IF random() < 0.70 THEN
    genero := 'Hembra';
    nombre := nombres_h[1 + floor(random() * array_length(nombres_h,1))::INT];
  ELSE
    genero := 'Macho';
    nombre := nombres_m[1 + floor(random() * array_length(nombres_m,1))::INT];
  END IF;

  raza   := razas[1 + floor(random() * array_length(razas,1))::INT];
  fin    := fines[1 + floor(random() * array_length(fines,1))::INT];

  -- Estado acorde al género
  IF genero = 'Hembra' THEN
    estado := (ARRAY['Becerro / Becerra','Vaquilla','Vientre / Producción','Vaca Seca'])[1 + floor(random()*4)::INT];
  ELSE
    estado := (ARRAY['Becerro / Becerra','Torete / Novillo','Semental'])[1 + floor(random()*3)::INT];
  END IF;

  -- Peso realista según estado
  peso := CASE estado
    WHEN 'Becerro / Becerra'     THEN 80  + floor(random()*120)
    WHEN 'Vaquilla'              THEN 200 + floor(random()*150)
    WHEN 'Vientre / Producción'  THEN 380 + floor(random()*200)
    WHEN 'Vaca Seca'             THEN 350 + floor(random()*180)
    WHEN 'Torete / Novillo'      THEN 250 + floor(random()*200)
    WHEN 'Semental'              THEN 500 + floor(random()*300)
    ELSE 300 + floor(random()*200)
  END;

  -- Fecha de nacimiento realista
  fecha_nac := CURRENT_DATE - (floor(random() * 2190) + 30)::INT;  -- 1 mes a 6 años

  -- Arete SINIIGA formato MX + 4 dígitos
  arete := 'MX' || LPAD((1000 + i)::TEXT, 4, '0');

  INSERT INTO animales (
    user_id, arete_siniiga, nombre, raza, genero,
    peso_inicial, estado, fin_productivo, fecha_nacimiento, created_at
  ) VALUES (
    uid, arete, nombre, raza, genero,
    peso, estado, fin, fecha_nac,
    NOW() - (floor(random()*365))::INT * INTERVAL '1 day'
  )
  RETURNING id INTO animal_id;

  animal_ids := array_append(animal_ids, animal_id);
END LOOP;

RAISE NOTICE '✅ 200 animales insertados';

-- ─── 2. INSERTAR 150 TRATAMIENTOS EN 70 ANIMALES ────────────────────────────

-- Tomamos los primeros 70 animales del array
FOR j IN 1..70 LOOP
  animal_sel := animal_ids[j];

  -- Cada animal tiene entre 1 y 3 planes médicos
  FOR k IN 1..( 1 + floor(random()*2)::INT ) LOOP

    fecha_plan   := CURRENT_DATE - floor(random()*180)::INT;
    dias_trat    := 1 + floor(random()*7)::INT;

    INSERT INTO planes_medicos (
      animal_id, user_id, nombre_plan, tipo, estado, fecha_inicio
    ) VALUES (
      animal_sel, uid,
      diagnosticos[1 + floor(random() * array_length(diagnosticos,1))::INT],
      CASE WHEN random() < 0.4 THEN 'Tratamiento' ELSE 'Preventivo' END,
      CASE WHEN random() < 0.6 THEN 'Completado' ELSE 'Activo' END,
      fecha_plan
    )
    RETURNING id INTO plan_id;

    -- Dosis por cada día del tratamiento
    FOR d IN 0..(dias_trat-1) LOOP
      fecha_dosis  := fecha_plan + d;
      estado_dosis := CASE
        WHEN fecha_dosis < CURRENT_DATE THEN
          CASE WHEN random() < 0.8 THEN 'Completado' ELSE 'Pendiente' END
        ELSE 'Pendiente'
      END;

      INSERT INTO dosis_medicas (
        plan_id, producto, tipo_producto,
        fecha_programada, hora_programada, estado
      ) VALUES (
        plan_id,
        productos[1 + floor(random() * array_length(productos,1))::INT],
        tipos_prod[1 + floor(random() * array_length(tipos_prod,1))::INT],
        fecha_dosis,
        (ARRAY['08:00','10:00','12:00','14:00','16:00'])[1 + floor(random()*5)::INT]::time,
        estado_dosis
      );
    END LOOP;

  END LOOP;
END LOOP;

RAISE NOTICE '✅ Tratamientos insertados para 70 animales';

END $$;
