import type { PrivacyLabel } from '../catalog/catalog';
import type { TranslationKey } from '../i18n';
import { append, element, type Translate } from '../utilities/dom';

export function privacyLabels(labels: PrivacyLabel[], t: Translate, withDescriptions = false): HTMLElement {
  const wrapper = element('div', withDescriptions ? 'privacy-labels privacy-labels-expanded' : 'privacy-labels');
  for (const label of labels) {
    const item = element('span', `privacy-label privacy-${label}`, t(`label.${label}.name` as TranslationKey));
    if (withDescriptions) {
      const group = element('div', 'privacy-label-explanation');
      append(group, item, element('p', '', t(`label.${label}.description` as TranslationKey)));
      wrapper.append(group);
    } else {
      const description = t(`label.${label}.description` as TranslationKey);
      item.title = description;
      item.ariaLabel = `${t(`label.${label}.name` as TranslationKey)}: ${description}`;
      wrapper.append(item);
    }
  }
  return wrapper;
}
