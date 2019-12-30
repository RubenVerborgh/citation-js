"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.getBibtex = void 0;

var _json = _interopRequireDefault(require("./json"));

var _core = require("@citation-js/core");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const syntaxTokens = {
  '|': '{\\textbar}',
  '<': '{\\textless}',
  '>': '{\\textgreater}',
  '~': '{\\textasciitilde}',
  '^': '{\\textasciicircum}',
  '\\': '{\\textbackslash}',
  '{': '\\{\\vphantom{\\}}',
  '}': '\\vphantom{\\{}\\}'
};

function escapeValue(value) {
  return value.replace(/[|<>~^\\{}]/g, match => syntaxTokens[match]);
}

const richTextMappings = {
  'i': '\\textit{',
  'b': '\\textbf{',
  'sup': '\\textsuperscript{',
  'sub': '\\textsubscript{',
  'span style="font-variant: small-caps;"': '\\textsc{',
  'span class="nocase"': '{'
};

function serializeRichTextValue(value) {
  let tokens = value.split(/<(\/.*?|i|b|sc|sup|sub|span.*?)>/g);
  tokens = tokens.map((token, index) => {
    if (index % 2 === 0) {
      return escapeValue(token);
    } else if (token in richTextMappings) {
      return richTextMappings[token];
    } else {
      return '}';
    }
  });
  return tokens.join('');
}

function serializeValue(prop, value, dict) {
  value = serializeRichTextValue(value);
  return dict.listItem.join(`${prop} = {${value}},`);
}

function serializeEntry(entry, dict, opts) {
  let {
    type,
    label,
    properties
  } = (0, _json.default)(entry, opts);
  properties = Object.keys(properties).map(prop => serializeValue(prop, properties[prop], dict)).join('');
  return dict.entry.join(`@${type}{${label},${dict.list.join(properties)}}`);
}

const getBibtex = function (src, dict, opts) {
  let entries = src.map(entry => serializeEntry(entry, dict, opts)).join('');
  return dict.bibliographyContainer.join(entries);
};

exports.getBibtex = getBibtex;

const getBibTeXWrapper = function (src, html) {
  const dict = _core.plugins.dict.get(html ? 'html' : 'text');

  return getBibtex(src, dict);
};

var _default = getBibTeXWrapper;
exports.default = _default;