// Instance-specific facts in the existing upstream disclosure component.
import type React from 'react';
import { t } from '@/i18n';
import { InfoIcon } from './Icons';
import Modal from './Modal';
const PrivacyModal: React.FC<{isOpen:boolean; onClose:()=>void}> = ({isOpen,onClose}) => (
  <Modal isOpen={isOpen} onClose={onClose} title={t('Privacy Information')} icon={InfoIcon} size='medium'>
    <div className='ui-stack' data-gap='md' data-role='privacy'>
      <h3>TeXlyre at Utilibre</h3>
      <p>Your source files, PDFs and local accounts stay in this browser. Compilation runs on your device. Utilibre serves the application, fonts, compiler and bundled TeX packages; it does not receive your document for compilation.</p>
      <p>Remote collaboration, bibliography lookups, cloud backup plugins and remote package downloads are unavailable here. A missing package requires a different local bundle or a compatible desktop TeX installation; there is no outside compiler fallback.</p>
      <p>Guest sessions expire after 24 hours and logging out ends a guest session. Export your projects before either happens. A full account is still local to this browser, not an Authentik account or an online backup. Clearing site data can erase accounts and projects. Keep private, downloaded backups; there is no email recovery service.</p>
      <p>No analytics or remote error reporting is enabled. HTTPS delivery uses Cloudflare and Utilibre infrastructure, which necessarily see connection metadata. This is not an anonymity guarantee. External links leave this application.</p>
      <p><a href='https://utilibre.org/en/guides/latex-document' target='_blank' rel='noreferrer'>Guide and data handling</a> · <a href='https://utilibre.org/es/guias/documento-latex' lang='es' target='_blank' rel='noreferrer'>Guía y privacidad en español</a></p>
    </div>
  </Modal>
);
export default PrivacyModal;
