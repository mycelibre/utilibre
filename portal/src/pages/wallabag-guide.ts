import type { PracticalGuide } from './practical-guide-data.ts';
export const wallabagGuides: PracticalGuide[] = [{
  id: 'wallabag', paths: { en: 'guides/save-articles', es: 'guias/guardar-articulos' }, reviewedOn: '2026-10-10',
  tools: [{ id: 'wallabag', label: { en: 'Read and save articles in Wallabag', es: 'Leer y guardar artículos en Wallabag' } }],
  samples: [],
  references: [{ url: 'https://doc.wallabag.org/user/articles/', label: { en: 'Wallabag article documentation', es: 'Documentación de artículos de Wallabag' } }],
  copy: {
    en: {
      title: 'Save an article and keep a downloaded copy',
      intro: 'Keep a public article in your own reading list, then download its text for later. Wallabag needs a separate approved account; it does not use Utilibre OpenID.',
      prerequisites: 'Request access from the Wallabag catalogue card if you do not have an account. Use your own username and password, plus an authenticator code if you enabled MFA. This example uses the public Utilibre homepage, not a private link or document. The instructions name the English controls; the native configuration offers a language preference.',
      steps: [
        'Open Wallabag and sign in. If prompted for two-factor authentication, enter the current code from your authenticator. Never send your password, code or private article links to a public support thread.',
        'Select Add a new entry (the plus control), paste https://utilibre.org/en/ and submit it. This is a harmless practice page. Wait for the fetch to finish; do not repeatedly submit the same URL.',
        'Open Unread and select the saved page. Check that its article text is present, not just a title or an extraction-error message. Reload once to confirm the saved copy remains. Images and video are intentionally omitted.',
        'Open the article’s export controls and choose JSON for a portable copy, or TXT, PDF or EPUB for reading. Download and reopen it with a compatible local reader. Check a paragraph against the saved article. Exported files contain content and source addresses; keep sensitive copies private. This is an article export, not an entire account backup.',
        'To remove the practice article, choose Delete and confirm. It should disappear from your list and its saved view should no longer open. Keep any downloaded copy you still need. Sign out when using a shared computer.',
      ],
      success: 'The article remains readable after reload, the downloaded copy contains its text, and deleting the practice article removes it from the live library.',
      troubleshooting: 'Some sites block extraction or require login. A page larger than the two-MiB fetch limit can fail; open the original deliberately instead. A 429 response means wait before trying again. Public registration, API/mobile clients, public sharing and article images are disabled here. For feed items, existing FreshRSS users can use favourites, or manually copy an article URL into Wallabag; no automatic synchronization is configured.',
      privacy: 'Utilibre’s server fetches the requested page and can read your stored articles, notes and reading state. They are private to your account in the application, not end-to-end encrypted. Remote article images and embedded media are blocked in this browser interface. Articles have no automatic expiry; delete them when no longer needed. Native account deletion is in account configuration. Retained encrypted local and off-host backups can outlive deletion, and exports remain wherever you save them. No visitor analytics is enabled.',
      next: 'Save only the articles you want to keep. Export important reading before deleting an account, and do not assume another reader will block remote resources in the same way. Keep using FreshRSS for subscriptions and Wallabag for selected full-text articles.',
    },
    es: {
      title: 'Guardá un artículo y conservá una copia descargada',
      intro: 'Conservá un artículo público en tu propia lista de lecturas y descargá su texto para después. Wallabag requiere una cuenta aprobada por separado; no usa OpenID de Utilibre.',
      prerequisites: 'Si no tenés cuenta, solicitá acceso desde la ficha de Wallabag del catálogo. Usá tu usuario y contraseña, y el código del autenticador si activaste MFA. Este ejemplo usa la portada pública de Utilibre, no un enlace ni un documento privado. Los pasos nombran los controles en inglés; la configuración nativa ofrece una preferencia de idioma.',
      steps: [
        'Abrí Wallabag e iniciá sesión. Si aparece la autenticación de dos factores, ingresá el código actual de tu autenticador. Nunca enviés contraseñas, códigos ni enlaces privados de artículos a una conversación pública de soporte.',
        'Elegí Add a new entry (el control con el signo más), pegá https://utilibre.org/en/ y enviá la dirección. Es una página de práctica sin datos privados. Esperá a que termine la carga; no enviés la misma dirección repetidamente.',
        'Abrí Unread y seleccioná la página guardada. Comprobá que aparezca el texto, no solo un título o un aviso de error de extracción. Recargá una vez para confirmar que la copia sigue ahí. Las imágenes y los videos se omiten a propósito.',
        'Abrí los controles de exportación del artículo y elegí JSON para una copia portable, o TXT, PDF o EPUB para leer. Descargala y volvé a abrirla con un lector local compatible. Compará un párrafo con el artículo guardado. La descarga contiene texto y direcciones de origen; mantené privadas las copias sensibles. Es una exportación del artículo, no un respaldo completo de la cuenta.',
        'Para quitar el artículo de práctica, elegí Delete y confirmá. Debe desaparecer de la lista y su vista guardada ya no debe abrirse. Conservá cualquier descarga que todavía necesités. Cerrá sesión si usás una computadora compartida.',
      ],
      success: 'El artículo sigue legible al recargar, la copia descargada contiene su texto y borrar el artículo de práctica lo quita de la biblioteca activa.',
      troubleshooting: 'Algunos sitios bloquean la extracción o requieren iniciar sesión. Una página que supere el límite de dos MiB puede fallar; abrí el original de forma consciente. Si aparece un error 429, esperá antes de reintentar. Aquí están desactivados el registro público, las aplicaciones de API o móviles, los enlaces públicos y las imágenes de artículos. Si ya usás FreshRSS, podés marcar favoritos o copiar manualmente una dirección a Wallabag; no hay sincronización automática.',
      privacy: 'El servidor de Utilibre obtiene la página solicitada y puede leer tus artículos, notas y estado de lectura. Son privados para tu cuenta dentro de la aplicación, pero no tienen cifrado de extremo a extremo. Esta interfaz bloquea imágenes remotas y contenido multimedia incrustado. Los artículos no caducan automáticamente; borralos cuando ya no los necesités. El borrado nativo de la cuenta está en su configuración. Los respaldos cifrados locales y externos pueden conservar datos borrados, y las exportaciones permanecen donde las guardés. No se habilitan estadísticas de visitantes.',
      next: 'Guardá solo lo que querás conservar. Exportá las lecturas importantes antes de borrar una cuenta y no asumás que otro lector bloqueará recursos remotos igual. Usá FreshRSS para suscripciones y Wallabag para los artículos completos que elijás.',
    },
  },
}];
