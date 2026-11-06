import type { Language } from '../i18n/index.ts';

// Original fictional examples. These are writing aids, not employment records.
export interface ResumeExample {
  id: string;
  title: string;
  name: string;
  summary: string;
  education: string;
  experience: string;
  activities: string[];
  skills: string[];
  advice: string;
}

export const resumeExamples: Record<Language, ResumeExample[]> = {
  es: [
    {
      id: 'primer-empleo', title: 'Primer empleo: estudios y un proyecto', name: 'María Ejemplo — PERFIL FICTICIO',
      summary: 'Bachiller en Ciencias y Letras con práctica escolar en hojas de cálculo y organización de materiales. Busco una oportunidad de apoyo administrativo para seguir aprendiendo.',
      education: 'Bachillerato en Ciencias y Letras · Instituto ficticio · 2025',
      experience: 'Proyecto escolar: inventario de una biblioteca · 2025',
      activities: ['Organicé una lista de libros por título y categoría en una hoja de cálculo.', 'Revisé registros repetidos con mi grupo y preparé una lista de consulta.'],
      skills: ['Hojas de cálculo: ordenar datos y usar sumas básicas.', 'Redacción de correos y organización de archivos.', 'Español; inglés básico de lectura.'],
      advice: 'Si no tenés experiencia laboral, dejá los estudios y proyectos primero. Identificá cada actividad como escolar o voluntaria; no la presentés como un empleo.',
    },
    {
      id: 'atencion-cliente', title: 'Atención al cliente: explicar tareas concretas', name: 'José Ejemplo — PERFIL FICTICIO',
      summary: 'Experiencia de atención al cliente en un comercio familiar. He recibido pedidos, explicado productos y organizado entregas. Busco un puesto de atención al cliente o ventas.',
      education: 'Bachillerato en Computación · Instituto ficticio · 2023',
      experience: 'Apoyo en atención al cliente · Comercio familiar ficticio · enero de 2024–diciembre de 2025',
      activities: ['Recibí pedidos y confirmé con cada cliente los productos y cantidades.', 'Registré entregas pendientes y comuniqué las consultas al encargado.', 'Organicé productos y revisé etiquetas de precios.'],
      skills: ['Atención presencial y comunicación por escrito.', 'Registro básico de pedidos en hojas de cálculo.', 'Español.'],
      advice: 'El trabajo en un negocio familiar también puede ser pertinente. Explicá tu función real. Agregá cifras o resultados solo cuando podás respaldarlos.',
    },
    {
      id: 'apoyo-administrativo', title: 'Apoyo administrativo: orden y precisión', name: 'Ana Ejemplo — PERFIL FICTICIO',
      summary: 'Perito Contador con práctica supervisada en organización de documentos y registro de información. Busco un puesto de auxiliar administrativo con tareas de archivo y apoyo a un equipo.',
      education: 'Perito Contador · Instituto ficticio · 2025',
      experience: 'Práctica supervisada · Oficina ficticia · agosto–octubre de 2025',
      activities: ['Clasifiqué documentos por fecha y tipo según las instrucciones del equipo.', 'Ingresé registros en una hoja de cálculo y comparé los datos con el documento original.', 'Preparé listados de documentos pendientes para revisión del supervisor.'],
      skills: ['Hojas de cálculo: filtros, sumas y revisión de datos.', 'Archivo digital y redacción de correspondencia.', 'Español.'],
      advice: 'Distinguí una práctica supervisada de un empleo y nombrá las herramientas que realmente manejás. No incluyás documentos ni datos confidenciales de una empresa anterior.',
    },
  ],
  en: [
    {
      id: 'primer-empleo', title: 'First job: education and a project', name: 'María Example — FICTIONAL PROFILE',
      summary: 'Secondary-school graduate with classroom practice in spreadsheets and organizing materials. Seeking an administrative support opportunity to continue learning.',
      education: 'Bachillerato en Ciencias y Letras · Fictional school · 2025',
      experience: 'School project: library inventory · 2025',
      activities: ['Organized a list of books by title and category in a spreadsheet.', 'Reviewed duplicate records with my group and prepared a reference list.'],
      skills: ['Spreadsheets: sorting data and basic sums.', 'Writing emails and organizing files.', 'Spanish; basic reading in English.'],
      advice: 'If you have no employment history, put education and projects first. Label school and volunteer activities accurately; do not present them as paid employment.',
    },
    {
      id: 'atencion-cliente', title: 'Customer service: describe specific tasks', name: 'José Example — FICTIONAL PROFILE',
      summary: 'Customer service experience in a family shop, taking orders, explaining products and organizing deliveries. Seeking a customer service or sales role.',
      education: 'Bachillerato en Computación · Fictional school · 2023',
      experience: 'Customer service support · Fictional family shop · January 2024–December 2025',
      activities: ['Received orders and confirmed products and quantities with customers.', 'Recorded pending deliveries and passed questions to the manager.', 'Organized products and checked price labels.'],
      skills: ['In-person customer service and written communication.', 'Basic order records in spreadsheets.', 'Spanish.'],
      advice: 'Work in a family business can be relevant. Describe your actual responsibilities. Include figures or results only when you can support them.',
    },
    {
      id: 'apoyo-administrativo', title: 'Administrative support: organization and accuracy', name: 'Ana Example — FICTIONAL PROFILE',
      summary: 'Perito Contador graduate with supervised practice organizing documents and entering records. Seeking an administrative assistant role involving filing and team support.',
      education: 'Perito Contador · Fictional school · 2025',
      experience: 'Supervised work placement · Fictional office · August–October 2025',
      activities: ['Filed documents by date and type following the team’s instructions.', 'Entered spreadsheet records and compared them with the source documents.', 'Prepared lists of outstanding documents for the supervisor to review.'],
      skills: ['Spreadsheets: filters, sums and checking data.', 'Digital filing and correspondence.', 'Spanish.'],
      advice: 'Distinguish a supervised placement from employment and name tools you actually use. Do not include confidential documents or information from a previous employer.',
    },
  ],
};
