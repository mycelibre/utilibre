// Native customization files, no changes to editors or encryption protocols.
import {readFile,writeFile,copyFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const root='/opt/utilibre/src/cryptpad';
let config=await readFile(`${root}/customize.dist/ckeditor-config.js`,'utf8');
const marker='    config.disableObjectResizing = true;';
assert.equal(config.split(marker).length,2,'Re-review the upstream CKEditor config.');
config=config.replace(marker,`${marker}
    // No vendor version ping; keep the CDATA advisory's enabling modes off.
    config.versionCheck = false;
    config.fullPage = false;
    config.disallowedContent = 'script; style';`);
await writeFile(`${root}/customize/ckeditor-config.js`,config);
await copyFile(new URL('./cryptpad/application_config.js',import.meta.url),`${root}/customize/application_config.js`);
console.log('Native CKEditor and application privacy configuration prepared.');
