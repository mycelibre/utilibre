// Supported customization; no editor or cryptographic code changes.
(() => {
  const factory = AppConfig => {
    AppConfig.disableFeedback = true;
    AppConfig.surveyURL = '';
    AppConfig.source = {default:'https://pdf.utilibre.org/utilibre-source/cryptpad-utilibre.tar.gz'};
    AppConfig.supportLanguages = ['es', 'en'];
    AppConfig.premiumTypes = [];
    AppConfig.privacy = {default:'https://utilibre.org/es/privacidad',en:'https://utilibre.org/en/privacy',es:'https://utilibre.org/es/privacidad'};
    AppConfig.terms = {default:'https://utilibre.org/es/uso-aceptable',en:'https://utilibre.org/en/acceptable-use',es:'https://utilibre.org/es/uso-aceptable'};
    return AppConfig;
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('../www/common/application_config_internal.js'));
  } else {
    define(['/common/application_config_internal.js'], factory);
  }
})();
