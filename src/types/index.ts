// ─── Medicamentos ─────────────────────────────────────────────────────────────

export type TipoMedicamento = 'Medicamento' | 'Vacuna' | 'Vitamina' | 'Antiparasitario' | 'Mineral';
export type UnidadMedicamento = 'ml' | 'mg' | 'dosis' | 'tabletas' | 'kg' | 'g';

export interface Medicamento {
  id: string;
  user_id: string;
  nombre: string;
  tipo: TipoMedicamento;
  unidad: UnidadMedicamento;
  cantidad_disponible: number;
  cantidad_minima: number;
  descripcion?: string;
  created_at?: string;
  updated_at?: string;
}

// ─── Animales ────────────────────────────────────────────────────────────────

export type Genero = 'Macho' | 'Hembra';

export type EstadoAnimal =
  | 'Becerro / Becerra'
  | 'Vaquilla'
  | 'Vientre / Producción'
  | 'Vaca Seca'
  | 'Torete / Novillo'
  | 'Semental'
  | 'En engorda'
  | 'Cargada'
  | 'Enferma'
  | 'Vacía'
  | 'Activo';

export type FinProductivo =
  | 'Pie de Cría'
  | 'Engorda'
  | 'Doble Propósito'
  | 'Lechero Especializado';

export interface Animal {
  id: string;
  user_id: string;
  arete_siniiga: string;
  nombre?: string;
  raza: string;
  genero: Genero;
  peso_inicial: number;
  estado?: EstadoAnimal;
  fin_productivo?: FinProductivo;
  fecha_nacimiento?: string;
  id_padre?: string | null;
  id_madre?: string | null;
  created_at?: string;
  // Relaciones opcionales (join)
  padre?: AnimalRef | null;
  madre?: AnimalRef | null;
}

/** Referencia ligera a un animal (para genealogía) */
export interface AnimalRef {
  id: string;
  arete_siniiga: string;
}

// ─── Pesajes ─────────────────────────────────────────────────────────────────

export interface Pesaje {
  id: string;
  animal_id: string;
  user_id: string;
  peso: number;
  fecha_pesaje: string;
}

// ─── Salud / Planes médicos ───────────────────────────────────────────────────

export type EstadoDosis = 'Pendiente' | 'Completado' | 'Cancelado';

export interface PlanMedico {
  id: string;
  animal_id: string;
  nombre_plan: string;
  // Relación opcional
  animales?: Pick<Animal, 'arete_siniiga' | 'nombre'>;
}

export interface DosisMedica {
  id: string;
  plan_id: string;
  producto: string;
  tipo_producto?: string;
  estado: EstadoDosis;
  fecha_programada: string;
  hora_programada?: string;
  // Relación opcional (join)
  planes_medicos?: PlanMedico;
}

// ─── Sync queue ───────────────────────────────────────────────────────────────

export type OperacionSync = 'INSERT' | 'UPDATE' | 'DELETE';

export interface TareaSync {
  tabla: string;
  operacion: OperacionSync;
  datos: Record<string, unknown>;
  timestamp: number;
}

// ─── Caché con TTL ────────────────────────────────────────────────────────────

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// ─── Alertas / Modales ────────────────────────────────────────────────────────

export type TipoAlerta = 'exito' | 'error' | 'info';

export interface EstadoAlerta {
  visible: boolean;
  titulo: string;
  mensaje: string;
  tipo: TipoAlerta;
}

// ─── Estadísticas (Reportes) ──────────────────────────────────────────────────

export interface StatsRancho {
  total: number;
  machos: number;
  hembras: number;
  alertas: number;
  pesoTotal: number;
}
