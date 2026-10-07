import type { Language } from '../i18n/index.ts';

export interface GuideCopy {
  title: string; intro: string; prerequisites: string;
  steps: string[]; success: string; troubleshooting: string; privacy: string; next: string;
}
export interface PracticalGuide {
  id: string; paths: Record<Language, string>; tools: Array<{ id: string; path?: string; label: Record<Language, string> }>;
  samples: Array<{ file: string; localized?: boolean; label: Record<Language, string> }>;
  copy: Record<Language, GuideCopy>;
}
// Maintained instructions for deployed interfaces, not a separate service registry.
// Access, privacy details and launch destinations come from the catalogue.
export const practicalGuides: PracticalGuide[] = [
  {
    id: 'scan', paths: { en: 'guides/scanned-documents', es: 'guias/documentos-escaneados' },
    tools: [{ id: 'bentopdf', path: 'ocr-pdf.html', label: { en: 'Recognize scanned text', es: 'Reconocer texto escaneado' } }, { id: 'privatebin', label: { en: 'Share checked text', es: 'Compartir texto revisado' } }],
    samples: [{ file: 'scan-{lang}.pdf', localized: true, label: { en: 'Fictional scanned notice (PDF)', es: 'Aviso escaneado ficticio (PDF)' } }],
    copy: {
      en: {
        title: 'Turn a scanned document into useful text and share it',
        intro: 'Use BentoPDF to recognize a page, check the result and save a searchable PDF or share corrected text. No account is needed.',
        prerequisites: 'Keep the original. Start with the fictional notice below and a browser that can download files. OCR downloads processing components and language data on first use; allow time and network access. A small, upright scan is a better starting point than a large document.',
        steps: [
          'First try selecting a sentence in the original PDF. If its text already copies correctly, skip OCR: copy the needed text, check it against the page and continue to sharing. A scanned image needs recognition.',
          'Open Recognize scanned text and select the fictional PDF. Select English for the English sample or Spanish; Castilian for the Spanish sample. The interface language does not choose the OCR language. Deselect languages you do not need.',
          'Run the OCR processing action and wait for the results. Read the recognized text beside the original. Our fictional notice mentions María Example, 12 May 2030 and 24 books; check the name, accent, date and quantity rather than trusting plausible-looking words. In our English-language test, María became Maria: restore the accent in your copied text.',
          'Copy the recognized text into a local text editor and correct mistakes there. Extracted text is plain content; it does not preserve a document layout. Download the searchable PDF if you need the original page appearance plus a selectable text layer. Corrections to your copied text do not automatically repair that PDF’s OCR layer.',
          'Reopen the downloaded PDF. Search for “24” and select a sentence. For sharing just the corrected text, open Share checked text, paste only what the recipient needs, choose an expiry and optionally a password or burn-after-reading, then create the paste. Send the complete link privately; send a password separately if used.',
          'For a PDF, use the file-transfer guide instead. Reduce its size only if the recipient needs a smaller file: preserve the original, compare readability after compression and reopen the output. Do not assume that conversion to Word preserves layout or that painting over PDF text securely redacts it.',
        ],
        success: 'You can copy a meaningful sentence, and the corrected text matches the original names, accents, dates and numbers. The saved PDF opens and its text can be searched. If sharing a one-time paste, let the intended recipient open it first: testing that link yourself consumes it.',
        troubleshooting: 'Rotate sideways pages before recognition. For unclear scans, obtain a clearer, evenly lit scan rather than enlarging blur. Try one page at a time if memory is limited. Check whether the language download finished. Handwriting and tables need extra review; OCR is not a guarantee of accuracy.',
        privacy: 'The document is processed in the browser. Downloading OCR components can contact external asset providers; that is different from uploading the document. PrivateBin uploads browser-encrypted text to Utilibre. The complete sharing link carries the key; a password adds a separate requirement. A recipient can retain a copy even when a paste expires or is burned.',
        next: 'Use the file-transfer guide to send the checked PDF, or the PDF & OCR reference for merging pages.',
      },
      es: {
        title: 'Convertí un documento escaneado en texto útil y compartilo',
        intro: 'Usá BentoPDF para reconocer una página, revisar el resultado y guardar un PDF con texto seleccionable o compartir texto corregido. No necesitás cuenta.',
        prerequisites: 'Conservá el original. Empezá con el aviso ficticio de abajo y un navegador que permita descargar archivos. El primer OCR descarga componentes y datos del idioma: dejá tiempo y acceso a la red. Conviene empezar con una página pequeña y derecha.',
        steps: [
          'Intentá seleccionar una frase en el PDF original. Si se copia correctamente, no necesitás OCR: copiá el texto útil, comparalo con la página y pasá a compartirlo. Una imagen escaneada sí necesita reconocimiento.',
          'Abrí Reconocer texto escaneado y seleccioná el PDF ficticio. Elegí Spanish; Castilian para el ejemplo en español o English para el ejemplo en inglés. El idioma de la interfaz no elige el del OCR. Desmarcá los idiomas que no necesités.',
          'Ejecutá el reconocimiento y esperá los resultados. Compará el texto con el original. El aviso ficticio menciona a María Ejemplo, el 12 de mayo de 2030 y 24 libros: revisá nombre, tilde, fecha y cantidad, aunque el resultado parezca convincente.',
          'Copiá el texto reconocido a un editor local y corregilo ahí. El texto extraído no conserva el diseño del documento. Descargá el PDF con texto seleccionable si necesitás conservar la apariencia y agregar una capa de texto. Corregir la copia de texto no corrige automáticamente la capa OCR del PDF.',
          'Reabrí el PDF descargado. Buscá “24” y seleccioná una frase. Para compartir solo el texto corregido, abrí Compartir texto revisado, pegá únicamente lo necesario, elegí vencimiento y, si te sirve, contraseña o eliminación tras la lectura. Creá el texto compartido y enviá el enlace completo en privado; enviá la contraseña por separado si usaste una.',
          'Para enviar el PDF, usá la guía de transferencia. Reducí su tamaño solo si hace falta: conservá el original, compará la legibilidad después de comprimir y reabrí el resultado. No asumás que convertir a Word conserva el diseño ni que pintar encima del texto de un PDF lo elimina de forma segura.',
        ],
        success: 'Podés copiar una frase útil y el texto corregido coincide con los nombres, tildes, fechas y números originales. El PDF guardado abre y permite buscar palabras. Si compartís un enlace de una sola lectura, dejá que lo abra primero el destinatario: probarlo vos lo consume.',
        troubleshooting: 'Girá las páginas de lado antes del OCR. Si están borrosas, buscá un escaneo más claro y bien iluminado: agrandar el desenfoque no recupera letras. Probá una página por vez si falta memoria y comprobá que termine la descarga del idioma. Revisá con más cuidado tablas y escritura a mano.',
        privacy: 'El documento se procesa en el navegador. La descarga de componentes puede contactar proveedores externos; no es lo mismo que subirles el documento. PrivateBin sube texto cifrado en el navegador a Utilibre. El enlace completo contiene la clave; una contraseña agrega otro requisito. El destinatario puede conservar una copia aunque el texto venza o se elimine después de leerlo.',
        next: 'Usá la guía de transferencia para enviar el PDF revisado, o la referencia de PDF y OCR para unir páginas.',
      },
    },
  },
  {
    id: 'image', paths: { en: 'guides/prepare-image', es: 'guias/preparar-imagen' },
    tools: [{ id: 'minipaint', label: { en: 'Resize an image in miniPaint', es: 'Cambiar el tamaño en miniPaint' } }, { id: 'omni-compress-image', label: { en: 'Compress the exported image', es: 'Comprimir la imagen exportada' } }],
    samples: [{ file: 'fictional-image.jpg', label: { en: 'Fictional practice image (JPEG)', es: 'Imagen ficticia de práctica (JPEG)' } }],
    copy: {
      en: {
        title: 'Prepare an image for a website or application',
        intro: 'Make an image smaller, inspect it and download a usable file. Use miniPaint for dimensions and OmniTools for compression.',
        prerequisites: 'Read the destination’s actual rules first: dimensions, maximum file size and accepted formats. Our hypothetical practice requirement is 600 × 400 pixels and under 200 KB, not a passport or identity-photo standard. The sample is a generated illustration, not an application screenshot.',
        steps: [
          'Download the 1200 × 800 sample. In miniPaint choose File → Open → Open File and select it. Keep the original; work on a copy. A larger screen makes the editor easier to use.',
          'Decide whether to crop or resize. Cropping removes edges; resizing changes the pixel dimensions of the whole image. Our sample already has the required 3:2 ratio, so it does not need cropping. For a different ratio, crop a copy to the required shape without removing important information, then resize.',
          'Choose Image → Resize, not Canvas Size. Enter width 600 and leave the height and percentage fields blank so the other dimension follows the original ratio. Apply the change and check that the image is 600 × 400. Entering unrelated width and height values can distort a picture.',
          'Use File → Export to save an image. PNG preserves sharp graphics and transparency; JPEG suits many photographs but cannot preserve transparent areas. Keep a separate editable project if you need layers later: an exported image is not a layered project.',
          'If the file exceeds the destination limit, open Compress the exported image, select your export, and download the compressed result. Compare the actual saved file size and appearance. Compression does not guarantee a specific reduction, and an already optimized file may not shrink.',
          'Reopen the final download and check its pixel dimensions, extension, size and legibility. Upload it to the intended destination only after this check. The website receiving your final submission has its own data policy.',
        ],
        success: 'For the fictional exercise, the reopened image is 600 × 400, below 200 KB, and its text is readable. Real destination requirements take precedence over this example.',
        troubleshooting: 'Still too large? Reduce dimensions further only if the destination allows it, or try a supported lossy format and compare carefully. Blurry text may need PNG or less compression. Upscaling a small image cannot restore missing detail. Keep transparency when the destination needs it; JPEG may replace it with a background.',
        privacy: 'These edits run locally in your browser; the selected image is not uploaded in this flow. The browser still downloads the applications. Preferences or drafts may survive a tab closing; download your work, and do not treat browser storage as a backup. Avoid leaving originals or downloads on a shared computer.',
        next: 'If the picture contains private details, use the covering-information guide before sharing it.',
      },
      es: {
        title: 'Prepará una imagen para una web o una solicitud',
        intro: 'Reducí una imagen, revisala y descargá un archivo útil. Usá miniPaint para las dimensiones y OmniTools para comprimir.',
        prerequisites: 'Leé primero las reglas reales del destino: dimensiones, tamaño máximo y formatos admitidos. El requisito hipotético del ejercicio es 600 × 400 píxeles y menos de 200 KB; no es una norma para pasaportes o fotos de identidad. El ejemplo es una ilustración generada, no una captura de la aplicación.',
        steps: [
          'Descargá el ejemplo de 1200 × 800. En miniPaint elegí File → Open → Open File y seleccioná el archivo. Conservá el original y trabajá con una copia. Una pantalla grande facilita usar el editor.',
          'Decidí si necesitás recortar o redimensionar. Recortar quita bordes; redimensionar cambia los píxeles de toda la imagen. El ejemplo ya tiene proporción 3:2 y no necesita recorte. Si tu proporción es distinta, recortá una copia sin quitar información importante y después cambiá el tamaño.',
          'Elegí Image → Resize, no Canvas Size. Escribí 600 en el ancho y dejá vacíos la altura y los porcentajes para conservar la proporción original. Aplicá el cambio y comprobá 600 × 400. Escribir ancho y alto sin respetar su relación puede deformar la imagen.',
          'Usá File → Export para guardar una imagen. PNG conserva gráficos nítidos y transparencia; JPEG sirve para muchas fotos, pero no conserva zonas transparentes. Guardá además un proyecto editable si necesitás las capas: la imagen exportada no es un proyecto por capas.',
          'Si el archivo supera el límite, abrí Comprimir la imagen exportada, seleccioná tu archivo y descargá el resultado. Compará el tamaño real y la apariencia. Comprimir no garantiza una reducción concreta; un archivo ya optimizado puede no achicarse.',
          'Reabrí la descarga final y revisá dimensiones, extensión, tamaño y legibilidad. Subila al destino solamente después de revisarla. Ese sitio tiene su propia política para los datos que le enviás.',
        ],
        success: 'En este ejercicio ficticio, la imagen reabierta mide 600 × 400, pesa menos de 200 KB y permite leer el texto. Los requisitos reales del destino mandan sobre este ejemplo.',
        troubleshooting: '¿Todavía pesa demasiado? Reducí más las dimensiones solo si el destino lo permite, o probá un formato con pérdida y compará. Para texto borroso, probá PNG o menos compresión. Agrandar una imagen pequeña no recupera detalle. Si necesitás transparencia, evitá JPEG: puede reemplazarla por un fondo.',
        privacy: 'Las ediciones se hacen en el navegador; esta operación no sube la imagen elegida. El navegador sí descarga las aplicaciones. Las preferencias o borradores pueden persistir al cerrar una pestaña: descargá tu trabajo y no usés el almacenamiento del navegador como respaldo. No dejés originales o descargas en una computadora compartida.',
        next: 'Si la imagen contiene detalles privados, seguí la guía para ocultarlos antes de compartirla.',
      },
    },
  },
  {
    id: 'photo', paths: { en: 'guides/private-photo', es: 'guias/foto-privada' },
    tools: [{ id: 'image-scrubber', label: { en: 'Cover details with Image Scrubber', es: 'Tapar detalles con Image Scrubber' } }, { id: 'pairdrop', label: { en: 'Transfer the checked image', es: 'Transferir la imagen revisada' } }, { id: 'hatsh', label: { en: 'Encrypt a file locally (optional)', es: 'Cifrar un archivo localmente (opcional)' } }],
    samples: [{ file: 'fictional-image.jpg', label: { en: 'Fictional details and EXIF practice image', es: 'Imagen ficticia con detalles y EXIF de práctica' } }],
    copy: {
      en: {
        title: 'Share a photo after covering private information',
        intro: 'Use opaque paint in Image Scrubber and inspect a flattened download. Removing metadata alone does not hide what is visible in a picture.',
        prerequisites: 'Practice on the synthetic illustration below. Its name, code and EXIF Artist value are explicitly fictional. Keep any real original private. This reduces disclosure of selected details; it cannot guarantee that a person or place is unrecognizable.',
        steps: [
          'Open Image Scrubber and load the sample. Review the metadata screen and continue to the editor. Identify the name “Alex Example” and code “SAMPLE-123”. On real photographs also inspect faces, badges, screens, addresses, reflections and distinctive backgrounds.',
          'Choose Paint, set a solid opaque color and a suitable brush size, and cover the entire name and code with a margin. Use solid paint, not light blur or a translucent stroke. Zoom in to find missed edges.',
          'Save the image using the application’s save control. This produces a flattened PNG: painted pixels replace the visible details in that output. Do not share an editor project with reversible layers, the original file, or a screenshot with other private screen content.',
          'Open the downloaded PNG in a separate viewer at full size. Check that neither fictional value remains legible and that the rest of the image is usable. Our output test checks opaque pixels and that the original EXIF Artist marker is absent; that is not a guarantee about every possible metadata format.',
          'Use Transfer the checked image to send only the reviewed PNG. Confirm the recipient and filename. If you need password-based file encryption for later delivery, hat.sh is optional: both people must be able to use its encryption/decryption flow, and the recipient needs the password through a separate channel.',
        ],
        success: 'The reopened PNG is flat, the intended details are completely covered, and you selected that output—not the original—for transfer. Review the whole image once more before sharing.',
        troubleshooting: 'If a detail shows through, return to the original and cover a larger area with fully opaque paint. A hidden name can still be inferred from other visible clues. Keep the original out of the sharing folder. A browser preview is not enough: inspect the downloaded file.',
        privacy: 'Image Scrubber processes the image on your device. The tested PNG export did not carry the sample’s EXIF metadata. Removing EXIF does not remove visible details, and a server delivering altered application code would remain a risk. PairDrop’s signaling and connection-discovery requests still reach servers; see its transfer guide for the deployed limits.',
        next: 'Follow the file-transfer guide with the sanitized image. Encryption is useful only when its recipient can decrypt it; it does not undo disclosure after opening.',
      },
      es: {
        title: 'Compartí una foto después de ocultar información privada',
        intro: 'Usá pintura opaca en Image Scrubber y revisá una descarga aplanada. Quitar metadatos no oculta lo que se ve en una imagen.',
        prerequisites: 'Practicá con la ilustración sintética de abajo. Su nombre, código y valor EXIF Artist son claramente ficticios. Conservá cualquier original real en privado. Esto reduce la exposición de ciertos detalles; no garantiza que una persona o un lugar sean irreconocibles.',
        steps: [
          'Abrí Image Scrubber y cargá el ejemplo. Revisá la pantalla de metadatos y avanzá al editor. Ubicá el nombre “Alex Example” y el código “SAMPLE-123”. En una foto real revisá también caras, credenciales, pantallas, direcciones, reflejos y fondos reconocibles.',
          'Elegí Paint, un color completamente opaco y un pincel adecuado. Cubrí todo el nombre y el código, dejando margen. Usá pintura sólida, no desenfoque leve ni trazos transparentes. Acercá la imagen para encontrar bordes sin cubrir.',
          'Guardá la imagen con el control de la aplicación. La descarga es un PNG aplanado: los píxeles pintados reemplazan los detalles visibles en ese archivo. No compartás un proyecto con capas reversibles, el original ni una captura que muestre otros datos privados de la pantalla.',
          'Abrí el PNG descargado en otro visor y revisalo a tamaño completo. Ninguno de los valores ficticios debería ser legible. La prueba comprueba píxeles opacos y la ausencia del marcador EXIF Artist original; no garantiza el comportamiento de todos los formatos de metadatos.',
          'Usá Transferir la imagen revisada para enviar solamente el PNG comprobado. Confirmá destinatario y nombre de archivo. Si necesitás cifrarlo con contraseña para entregarlo después, hat.sh es opcional: ambas personas deben poder cifrar o descifrar ahí, y la contraseña debe viajar por otro canal.',
        ],
        success: 'El PNG reabierto está aplanado, los detalles están completamente tapados y elegiste ese resultado, no el original, para transferir. Revisá una vez más toda la imagen antes de compartirla.',
        troubleshooting: 'Si algo se transparenta, volvé al original y cubrí un área mayor con pintura opaca. Un nombre tapado todavía puede deducirse por otras pistas. Dejá el original fuera de la carpeta que compartís. No alcanza con la vista previa: revisá el archivo descargado.',
        privacy: 'Image Scrubber procesa la imagen en tu dispositivo. El PNG de prueba no conservó los metadatos EXIF del ejemplo. Quitar EXIF no quita detalles visibles; también dependés de que el servidor entregue código confiable. PairDrop hace solicitudes de señalización y descubrimiento a servidores: consultá los límites en su guía.',
        next: 'Seguí la guía de transferencia con la imagen revisada. Cifrar sirve solo si el destinatario puede descifrar; no revierte lo que se divulga después de abrir el archivo.',
      },
    },
  },
  {
    id: 'poll', paths: { en: 'guides/meeting-poll', es: 'guias/encuesta-reunion' },
    tools: [{ id: 'pollaris', label: { en: 'Create a public Pollaris poll', es: 'Crear una encuesta pública en Pollaris' } }, { id: 'rallly', label: { en: 'Sign in as an approved Rallly organizer', es: 'Ingresar como organizador aprobado en Rallly' } }],
    samples: [],
    copy: {
      en: {
        title: 'Organize a meeting with a poll',
        intro: 'Create a Pollaris poll without an account, share the participant link and compare responses. Rallly is an alternative for organizers whose accounts have already been approved.',
        prerequisites: 'Prepare a short title and two or three options. Our fictional “Reading circle” uses 12 May 2030 at 18:00 and 13 May 2030 at 18:00, both Guatemala time (UTC−06:00). Replace these practice dates with future dates for your real meeting. This walkthrough uses a classic text-options poll, not automatic time-zone conversion.',
        steps: [
          'Open Pollaris and choose a new classic poll. Use a fictional organizer name, title and description. Put the time zone in the description and in the option labels so people in another country can convert correctly.',
          'Enter the two complete date/time options as text. Review the title, date, year and time zone before creating the poll. Do not include confidential meeting details or personal contact information unnecessarily.',
          'After creation, copy the participant link for invitations and keep the administrator/management link separately in a private place. The management link is a capability to change or delete the poll; do not send it to voters.',
          'Open the participant link in another browser profile or private window. Enter a fictional participant name, choose an option and submit the vote. This guest participation flow does not require registration. Check in the organizer view that the response appears.',
          'Inspect the responses; use the CSV export if you need a local copy. Tell participants the chosen time through your usual communication channel. This guide does not rely on automatic reminders or finalization.',
          'After practicing, use the management view to delete the test poll and confirm the deletion. For a real poll, keep the management link until you have finished handling responses. A public participant link should not be treated as confidential storage.',
        ],
        success: 'A second browser session can vote without an account, and the organizer can see that response. You retained the management link privately and sent only the participation link.',
        troubleshooting: 'If somebody cannot vote, check that you sent the participant link and that the poll still exists. Resolve ambiguous dates and time zones before voting. If you lose the management link, do not assume an account or email recovery exists. Report an error without posting the private link publicly.',
        privacy: 'Poll titles, options, participant names and votes are sent to and stored by Utilibre; they are not encrypted in the browser against the server. Use minimal identifying information. Server-side deletion is not proof of immediate deletion from backups. Rallly permits guest voting but creating polls requires an approved organizer account.',
        next: 'Share the participant URL directly, or use the QR guide for an in-person invitation. A QR does not add confidentiality.',
      },
      es: {
        title: 'Organizá una reunión con una encuesta',
        intro: 'Creá una encuesta en Pollaris sin cuenta, compartí el enlace de participación y compará las respuestas. Rallly es una alternativa para organizadores con cuenta ya aprobada.',
        prerequisites: 'Prepará un título corto y dos o tres opciones. El “Círculo de lectura” ficticio propone el 12 de mayo de 2030 a las 18:00 y el 13 de mayo de 2030 a las 18:00, hora de Guatemala (UTC−06:00). Reemplazá estas fechas de práctica por fechas futuras para tu reunión real. La guía usa una encuesta clásica con opciones de texto, no conversión automática de zonas horarias.',
        steps: [
          'Abrí Pollaris y elegí crear una encuesta clásica. Usá nombre de organizador, título y descripción ficticios. Incluí la zona horaria en la descripción y en cada opción para que las personas de otros países puedan convertir la hora.',
          'Escribí las dos opciones completas de fecha y hora. Revisá título, día, año y zona horaria antes de crear. No agregués detalles confidenciales ni datos de contacto innecesarios.',
          'Después de crearla, copiá el enlace de participación para invitar y guardá aparte el enlace de administración. Ese enlace permite cambiar o eliminar la encuesta: no se lo enviés a quienes solamente van a votar.',
          'Abrí el enlace de participación en otro perfil del navegador o una ventana privada. Escribí un nombre ficticio, elegí una opción y enviá el voto. Este flujo no requiere registro. Comprobá en la vista del organizador que aparezca la respuesta.',
          'Revisá las respuestas y usá la exportación CSV si necesitás una copia local. Avisá la hora elegida por tu canal habitual. Estos pasos no dependen de recordatorios ni de una finalización automática.',
          'Al terminar la práctica, eliminá la encuesta desde la administración y confirmá. En una encuesta real, conservá ese enlace hasta terminar de gestionar las respuestas. No usés el enlace público como almacenamiento confidencial.',
        ],
        success: 'Otra sesión del navegador puede votar sin cuenta y el organizador ve esa respuesta. Conservaste el enlace de administración en privado y compartiste solo el de participación.',
        troubleshooting: 'Si alguien no puede votar, revisá el enlace y que la encuesta exista. Aclará fechas y zonas horarias ambiguas antes de votar. Si perdés el enlace de administración, no asumás que hay recuperación por cuenta o correo. Reportá errores sin publicar el enlace privado.',
        privacy: 'Utilibre recibe y guarda títulos, opciones, nombres y votos; el navegador no los cifra frente al servidor. Usá la mínima identificación necesaria. Borrar en el servidor no demuestra eliminación inmediata de respaldos. Rallly deja votar como invitado, pero exige una cuenta aprobada para organizar.',
        next: 'Compartí el enlace de participación directamente o usá la guía de QR para una invitación presencial. Un QR no agrega confidencialidad.',
      },
    },
  },
  {
    id: 'chart', paths: { en: 'guides/csv-chart', es: 'guias/csv-grafica' },
    tools: [{ id: 'rawgraphs', label: { en: 'Make a chart in RAWGraphs', es: 'Crear una gráfica en RAWGraphs' } }],
    samples: [{ file: 'study-{lang}.csv', localized: true, label: { en: 'Fictional study hours (UTF-8 CSV)', es: 'Horas de estudio ficticias (CSV UTF-8)' } }],
    copy: {
      en: {
        title: 'Turn a CSV into a clear chart',
        intro: 'Compare three fictional study activities with a bar chart in RAWGraphs and download an SVG. The question is: which activity accounts for the most hours?',
        prerequisites: 'Download the UTF-8 sample below. Activity is a category; Hours is a numeric quantity in hours: Reading 12, Practice 8 and Review 6. These are invented totals, not Utilibre usage statistics. The installed application uses English interface labels.',
        steps: [
          'Open RAWGraphs. Open the CSV in a local text editor and paste its complete contents, including Activity,Hours, into the data text area. Keep the comma separator and one record per line. You can also select the file in the upload control.',
          'Check the parsed table before charting. Activity should be text and Hours should be numeric. If a spreadsheet saved semicolons or decimal commas, adjust the import delimiter or export a consistent CSV; do not simply delete punctuation inside quoted text.',
          'Choose Bar chart. Drag Activity to the Bars mapping and Hours to Size. The Spanish file uses Actividad and Horas in the same roles. Confirm that all three rows are included and no values are silently treated as text.',
          'Inspect the chart and its labels. Make enough room for the activity names. State the unit “hours” in the title or accompanying caption: “Fictional study hours by activity”. Use bar length and labels to convey the values, not color alone.',
          'Use Download and choose SVG. Open the saved SVG in a browser or image viewer. If you need to add a title outside the application’s available controls, include it in the surrounding document or caption rather than inventing a chart control.',
          'Publish a short text equivalent with the chart: “Reading takes 12 hours, Practice 8 and Review 6; Reading is highest. All values are fictional.” Retain the CSV so the chart can be reproduced.',
        ],
        success: 'The exported file opens, shows three correctly labeled bars, and Reading/Lectura is the longest. The values and unit match the CSV. A reader can understand the conclusion without relying on color.',
        troubleshooting: '“Cannot parse dataset” usually needs an input check: use the provided valid CSV, include headers, and inspect delimiter, quotes and encoding. Blank charts often mean missing field mappings or a numeric column read as text. Large datasets can exhaust browser memory; there is no arbitrary Utilibre row cap or silent truncation in this workflow. Try a clearly labeled subset for diagnosis, not as a replacement for your complete analysis.',
        privacy: 'The dataset is processed in the browser in this deployment. Loading the application still creates connection metadata. Save the CSV and export yourself: browser state is not a backup. An SVG or its labels can disclose the source values when shared.',
        next: 'Use the image guide if a destination requires a raster image, keeping a readable title and a text equivalent.',
      },
      es: {
        title: 'Convertí un CSV en una gráfica clara',
        intro: 'Compará tres actividades de estudio ficticias con barras en RAWGraphs y descargá un SVG. La pregunta es: ¿qué actividad ocupa más horas?',
        prerequisites: 'Descargá el ejemplo UTF-8. Actividad es una categoría; Horas es una cantidad numérica: Lectura 12, Práctica 8 y Repaso 6 horas. Son cifras inventadas, no estadísticas de uso de Utilibre. La aplicación instalada muestra controles en inglés.',
        steps: [
          'Abrí RAWGraphs. Abrí el CSV en un editor de texto local y pegá todo el contenido, incluido Actividad,Horas, en el área de datos. Conservá la coma como separador y un registro por línea. También podés seleccionar el archivo con el control de carga.',
          'Revisá la tabla interpretada antes de graficar. Actividad debe ser texto y Horas debe ser numérico. Si tu hoja de cálculo guardó puntos y coma o comas decimales, ajustá el separador de importación o exportá un CSV consistente; no borrés signos dentro de texto entre comillas sin revisarlo.',
          'Elegí Bar chart. Arrastrá Actividad a Bars y Horas a Size. El ejemplo en inglés usa Activity y Hours con las mismas funciones. Confirmá que estén las tres filas y que los números no se interpreten como texto.',
          'Revisá la gráfica y sus etiquetas. Dejá espacio para los nombres. Indicá la unidad en un título o texto acompañante: “Horas de estudio ficticias por actividad”. Usá longitud y etiquetas para comunicar los valores, no solo colores.',
          'Usá Download y elegí SVG. Abrí el archivo guardado en un navegador o visor. Si necesitás un título que los controles disponibles no permiten agregar, ponelo en el documento o texto que acompaña la gráfica.',
          'Publicá también una explicación: “Lectura ocupa 12 horas, Práctica 8 y Repaso 6; Lectura es la mayor. Todos los valores son ficticios”. Conservá el CSV para poder reproducir la gráfica.',
        ],
        success: 'El archivo abre, muestra tres barras correctamente etiquetadas y Lectura/Reading es la más larga. Los valores y la unidad coinciden con el CSV. La conclusión se entiende sin depender del color.',
        troubleshooting: 'Ante “Cannot parse dataset”, probá el CSV válido de esta guía y revisá encabezados, separador, comillas y codificación. Una gráfica vacía suele indicar campos sin asignar o números interpretados como texto. Los archivos grandes pueden agotar la memoria; este flujo no impone un tope arbitrario de filas ni las recorta silenciosamente. Usá un subconjunto claramente identificado para diagnosticar, no para sustituir tu análisis completo.',
        privacy: 'Esta instalación procesa el conjunto de datos en el navegador. Cargar la aplicación sí genera metadatos de conexión. Guardá el CSV y la exportación: el estado del navegador no es un respaldo. Un SVG y sus etiquetas pueden revelar los valores al compartirlos.',
        next: 'Usá la guía de imágenes si el destino exige una imagen rasterizada; conservá un título legible y una explicación de texto.',
      },
    },
  },
  {
    id: 'transfer', paths: { en: 'guides/file-transfer', es: 'guias/transferir-archivo' },
    tools: [{ id: 'pairdrop', label: { en: 'Open PairDrop on both devices', es: 'Abrir PairDrop en ambos dispositivos' } }],
    samples: [{ file: 'transfer-example.txt', label: { en: 'Harmless transfer sample (text)', es: 'Archivo inocuo de práctica (texto)' } }],
    copy: {
      en: {
        title: 'Move a file from your phone to your computer',
        intro: 'Try a small file with PairDrop before sending something important. Both devices need the page open and must be able to establish a peer connection.',
        prerequisites: 'Download the harmless text sample to the sending device. Use an up-to-date browser with WebRTC and downloads enabled. Start on the same trusted local network. We verified a byte-identical transfer between two Chromium sessions on one VM; this is not a physical-phone or every-network compatibility test.',
        steps: [
          'Open the same Utilibre PairDrop address on the phone and computer. Keep both pages visible. Each device receives a display name; compare the names shown at the bottom of the pages before selecting a destination.',
          'On a compatible local network the other device appears as a peer. Select its name on the sending device and choose transfer-example.txt. If discovery does not work, use the app’s pairing control on both devices and follow the displayed code instructions; pairing helps discovery but cannot force a blocked connection to work.',
          'On the receiving device, inspect the sender and filename, then accept the transfer. Only accept files you were expecting. Keep the phone awake and both browser tabs open until completion.',
          'Save or download the received file when prompted. Find it in the browser’s download list or the device’s Files/Downloads location; that location varies by browser and operating system.',
          'Open the text file and confirm that it says it is a fictional Utilibre transfer example. For a real document, open the received copy before removing the source. PairDrop is a transfer tool, not a backup or long-term file-hosting service.',
        ],
        success: 'The intended device receives a readable copy with the expected filename and contents. If that small test fails, do not assume a larger or important file will work.',
        troubleshooting: 'Guest Wi-Fi may isolate devices, and firewalls or VPN policies may block peer connections. Check whether your network permits this use; do not blindly disable a VPN, firewall or browser protections. Prevent the phone sleeping during transfer and confirm download permission. Different networks can work only when a direct WebRTC connection succeeds: this installation has no TURN relay. Pairing or a room cannot overcome every NAT/firewall restriction. If blocked, use a USB cable or another approved transfer method; do not keep retrying large files.',
        privacy: 'Utilibre runs signaling, and Cloudflare’s STUN service helps discover connection addresses; those services receive connection metadata. File data uses encrypted WebRTC between devices in the configured mode. No TURN relay and no WebSocket file fallback are enabled. A relay-enabled setup would carry encrypted WebRTC traffic; the separate WebSocket fallback has different server-readability properties and is disabled here. This is not a blanket promise that browser networking never touches a server.',
        next: 'Use the image or OCR guide to prepare a file before sending. Download important work to a location you control; clearing browser data or losing a device can lose local work.',
      },
      es: {
        title: 'Pasá un archivo del teléfono a la computadora',
        intro: 'Probá un archivo pequeño con PairDrop antes de enviar algo importante. Ambos dispositivos necesitan la página abierta y una conexión entre pares que funcione.',
        prerequisites: 'Descargá el texto de práctica al dispositivo emisor. Usá un navegador actualizado con WebRTC y descargas habilitadas. Empezá en la misma red local de confianza. Verificamos una transferencia con bytes idénticos entre dos sesiones de Chromium en una VM; no es una prueba en un teléfono físico ni en todas las redes.',
        steps: [
          'Abrí la misma dirección de PairDrop de Utilibre en el teléfono y la computadora. Dejá ambas páginas visibles. Cada dispositivo recibe un nombre: compará los nombres que aparecen al pie antes de elegir destino.',
          'En una red compatible, el otro dispositivo aparece como par. Seleccioná su nombre desde el emisor y elegí transfer-example.txt. Si no aparece, usá el control de emparejamiento en ambos y seguí las instrucciones del código. Emparejar ayuda a encontrarlos, pero no fuerza una conexión bloqueada.',
          'En el receptor, revisá emisor y nombre de archivo y aceptá la transferencia. Aceptá solo lo que esperabas recibir. Mantené el teléfono despierto y las pestañas abiertas hasta terminar.',
          'Guardá o descargá el archivo cuando se solicite. Buscalo en la lista de descargas del navegador o en Archivos/Descargas del dispositivo; la ubicación cambia según navegador y sistema.',
          'Abrí el texto y comprobá que indique que es un ejemplo ficticio de transferencia de Utilibre. Para un documento real, abrí la copia recibida antes de quitar la original. PairDrop transfiere archivos: no es un respaldo ni alojamiento permanente.',
        ],
        success: 'El dispositivo correcto recibe una copia legible con nombre y contenido esperados. Si la prueba pequeña falla, no asumás que un archivo grande o importante funcionará.',
        troubleshooting: 'El Wi-Fi de invitados puede aislar dispositivos; un firewall o una VPN pueden bloquear conexiones entre pares. Consultá si tu red permite este uso: no desactivés protecciones a ciegas. Evitá que el teléfono se duerma y revisá el permiso de descarga. Entre redes diferentes solo funciona si se establece una conexión WebRTC directa: no hay relay TURN. Emparejar o usar una sala no supera cualquier restricción. Si está bloqueado, usá un cable USB u otro método aprobado; no repitás transferencias grandes sin diagnóstico.',
        privacy: 'Utilibre opera la señalización y el servicio STUN de Cloudflare ayuda a descubrir direcciones; reciben metadatos de conexión. En esta configuración, el archivo viaja cifrado por WebRTC entre dispositivos. No hay relay TURN ni transferencia alternativa por WebSocket. Un relay habilitado transportaría tráfico WebRTC cifrado; la alternativa WebSocket tiene otras condiciones de lectura por el servidor y aquí está deshabilitada. Esto no significa que el navegador nunca contacte servidores.',
        next: 'Prepará el archivo con la guía de imágenes u OCR antes de enviarlo. Guardá el trabajo importante donde lo controles: borrar datos del navegador o perder el dispositivo puede hacerte perder trabajo local.',
      },
    },
  },
];

export function practicalGuidePath(id: string, language: Language): string {
  const guide = practicalGuides.find((item) => item.id === id);
  return guide ? `/${language}/${guide.paths[language]}` : `/${language}/${language === 'es' ? 'guias' : 'guides'}`;
}
