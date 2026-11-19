/**
 * @kevinshao2217/contour-sampler
 * Main module entry point exporting SamplerCore and ContourFormats
 */
const SamplerCore = require('./sampler-core.js');
const ContourFormats = require('./formats.js');

module.exports = {
  SamplerCore,
  ContourFormats,
  defaults: SamplerCore.defaults,
  sampleFrame: SamplerCore.sampleFrame,
  lumaFromRGBA: SamplerCore.lumaFromRGBA,
  detectWhiteBg: SamplerCore.detectWhiteBg
};
