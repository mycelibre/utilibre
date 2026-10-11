import type { PracticalGuide } from './practical-guide-data.ts';
export const librespeedGuides: PracticalGuide[] = [{
  id: 'librespeed', paths: { en: 'guides/test-connection', es: 'guias/medir-conexion' },
  tools: [{ id: 'librespeed', label: { en: 'Open LibreSpeed', es: 'Abrir LibreSpeed' } }],
  samples: [], reviewedOn: '2026-10-11',
  references: [{ url: 'https://github.com/librespeed/speedtest-go/tree/v1.1.6', label: { en: 'LibreSpeed deployment and source', es: 'Despliegue y código de LibreSpeed' } }],
  copy: {
    en: {
      title: 'Check your connection to Utilibre',
      intro: 'Run a short LibreSpeed test to compare download, upload and response time. It measures one route to a shared server, not the whole Internet.',
      prerequisites: 'Use a current browser with JavaScript and workers. No account or personal file is needed. A test may consume hundreds of MB or several GB, so avoid it on a limited mobile-data plan. Stop your own optional large downloads before comparing results; do not disable security protections.',
      steps: [
        'Open LibreSpeed and read its limits. The page does not start a test automatically. Pick English or Español before starting.',
        'Choose Start test. The app measures Ping and Jitter, then Download and Upload using generated data. Leave the tab visible. Choose Stop test if you need to cancel.',
        'Wait for Test finished. Download and upload use Mbps; Ping and Jitter use milliseconds. Higher throughput and lower latency describe different properties. A zero or missing value may indicate a failed request or a busy service, not zero connectivity.',
        'As a fictional example, 20 Mbps download and 40 ms ping describe a transfer rate and a round-trip delay; neither proves that another website will perform the same way. Record your own values and whether you used Wi-Fi or a cable, if useful.',
        'If comparing two connection types, wait at least a minute and change one condition before one more test. Do not run repeated or concurrent tests. Close the page when finished; there is no server results history to delete.',
      ],
      success: 'The test reaches its finished state and displays download, upload, ping and jitter values. This confirms a completed measurement to this server, not an independently calibrated ISP benchmark.',
      troubleshooting: 'There is no configured speed throttle. Six simultaneous transfer requests are shared across visitors; a busy service may reject a test. If a value is missing or zero, wait before retrying. Server capacity, distance, Wi-Fi, browser scheduling, VPNs and other traffic can also affect results; one low value does not identify the cause. Compare at a different time and with your provider’s diagnostic before drawing conclusions.',
      privacy: 'Only generated test data is transferred; uploads are discarded. Telemetry, public result sharing and IP/ISP lookup are disabled. Your IP remains visible to the delivery infrastructure as with any connection, but is not submitted to a location service. The app has no account, results database or persistent user identifier. No personal files are requested.',
      next: 'Use the result alongside your provider’s own diagnostics if you need to investigate a persistent connection problem. Save a private note or screenshot before closing if you need a comparison.',
    },
    es: {
      title: 'Revisá tu conexión con Utilibre',
      intro: 'Hacé una prueba breve con LibreSpeed para comparar descarga, subida y tiempo de respuesta. Mide una ruta hacia un servidor compartido, no todo Internet.',
      prerequisites: 'Usá un navegador actual con JavaScript y workers. No necesitás cuenta ni archivo personal. Una prueba puede consumir cientos de MB o varios GB: evitala con un plan de datos móviles limitado. Detené tus descargas grandes opcionales antes de comparar; no desactivés protecciones de seguridad.',
      steps: [
        'Abrí LibreSpeed y leé sus límites. La página no inicia pruebas automáticamente. Elegí Español o English antes de comenzar.',
        'Elegí Iniciar prueba. La aplicación mide Latencia y Variación, y luego Descarga y Subida con datos generados. Dejá visible la pestaña. Elegí Detener prueba si necesitás cancelar.',
        'Esperá el mensaje Prueba terminada. Descarga y subida se expresan en Mbps; latencia y variación, en milisegundos. La capacidad de transferencia y la demora describen propiedades distintas. Un valor cero o incompleto puede indicar una solicitud fallida o un servicio ocupado, no ausencia de conexión.',
        'Como ejemplo ficticio, 20 Mbps de descarga y 40 ms de latencia describen una tasa de transferencia y una demora de ida y vuelta; no prueban que otra web vaya a funcionar igual. Anotá tus valores y si usaste wifi o cable, si te sirve.',
        'Si comparás dos tipos de conexión, esperá al menos un minuto y cambiá una sola condición antes de una prueba más. No ejecutés pruebas repetidas ni simultáneas. Cerrá la página al terminar; no hay un historial de resultados en el servidor que debás borrar.',
      ],
      success: 'La prueba termina y muestra valores de descarga, subida, latencia y variación. Esto confirma una medición hacia este servidor, no una certificación independiente de tu proveedor.',
      troubleshooting: 'No hay un límite artificial de velocidad. Se comparten seis solicitudes de transferencia simultáneas; si el servicio está ocupado, puede rechazar una prueba. Si falta un valor o aparece cero, esperá antes de repetir. También influyen la capacidad del servidor, distancia, wifi, navegador, VPN y otras transferencias; un valor bajo no identifica la causa. Compará en otro momento y con el diagnóstico de tu proveedor antes de sacar conclusiones.',
      privacy: 'Solo se transfieren datos generados para la prueba; las subidas se descartan. Están desactivadas la telemetría, la publicación de resultados y las consultas de IP/proveedor. Tu IP sigue siendo visible para la infraestructura de conexión, pero no se envía a un servicio de ubicación. La aplicación no tiene cuenta, base de resultados ni identificador persistente. No pide archivos personales.',
      next: 'Usá el resultado junto con los diagnósticos de tu proveedor para investigar un problema persistente. Guardá una nota o captura privada antes de cerrar si necesitás comparar.',
    },
  },
}];
