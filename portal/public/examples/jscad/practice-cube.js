// Original Utilibre practice geometry, CC0. Fictional dimensions in millimetres.
/* global require, module */
// JSCAD's documented file format uses CommonJS, not portal ES modules.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { cuboid } = require('@jscad/modeling').primitives;
const main = () => cuboid({ size: [20, 15, 10] });
module.exports = { main };
