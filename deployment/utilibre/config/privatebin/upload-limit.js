// Admission UI only. PrivateBin performs all reading, encryption and uploading.
// Server ciphertext limits remain necessary: clients can bypass a browser check.
(() => {
    'use strict';
    const maximum = 25_000_000;
    const rejectOversize = event => {
        if (event.type === 'change' && event.target.id !== 'file') return;
        const files = event.type === 'change' ? event.target.files
            : (event.dataTransfer || event.clipboardData)?.files;
        if (!files?.length || Array.from(files).reduce((sum, file) => sum + file.size, 0) <= maximum) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const input = document.getElementById('file');
        if (input) input.value = '';
        const app = window.jQuery.PrivateBin;
        app.AttachmentViewer.removeAttachmentData();
        app.AttachmentViewer.hideAttachment();
        app.AttachmentViewer.hideAttachmentPreview();
        app.Alert.showError(document.documentElement.lang.startsWith('es')
            ? 'Los archivos superan 25 MB en total (25 000 000 bytes). Elegí archivos más pequeños.'
            : 'Files exceed 25 MB in total (25,000,000 bytes). Choose smaller files.');
    };
    for (const event of ['change', 'drop', 'paste']) document.addEventListener(event, rejectOversize, true);
})();
