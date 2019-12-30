"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.parse = void 0;

var _core = require("@citation-js/core");

var _name = require("@citation-js/name");

var _date = require("@citation-js/date");

const months = [/jan(uary)?\.?/i, /feb(ruary)?\.?/i, /mar(ch)?\.?/i, /apr(il)?\.?/i, /may\.?/i, /jun(e)?\.?/i, /jul(y)?\.?/i, /aug(ust)?\.?/i, /sep(tember)?\.?/i, /oct(ober)?\.?/i, /nov(ember)?\.?/i, /dec(ember)?\.?/i];

const parseBibtexDate = function (value) {
  if (/{|}/.test(value)) {
    return {
      literal: value.replace(/[{}]/g, '')
    };
  } else if (/[—–]/.test(value)) {
    return {
      'date-parts': value.split(/[—–]/).map(part => (0, _date.parse)(part)['date-parts'][0])
    };
  } else {
    return (0, _date.parse)(value);
  }
};

const parseBibtexName = function (name) {
  if (/{|}/.test(name)) {
    const match = /^([^{}]+)\s+{([^{}]+)}$/.exec(name);

    if (match) {
      return {
        given: match[1],
        family: match[2]
      };
    } else {
      return {
        literal: name.replace(/{|}/g, '')
      };
    }
  } else {
    return (0, _name.parse)(name);
  }
};

const parseBibtexNameList = function (list) {
  const literals = [];
  list = list.replace(/%/g, '%0').replace(/{.*?}/g, m => `%[${literals.push(m) - 1}]`);
  return list.split(' and ').map(name => name.replace(/%\[(\d+)\]/g, (_, i) => literals[+i]).replace(/%0/g, '%')).map(parseBibtexName);
};

const richTextMappings = {
  textit: ['i'],
  textbf: ['b'],
  textsc: ['span', 'style="font-variant: small-caps;"'],
  textsuperscript: ['sup'],
  textsubscript: ['sub']
};

const parseBibtexRichText = function (text) {
  let tokens = text.split(/((?:\\[a-z]+)?{|})/);
  let closingTags = [];
  let hasTopLevelTag = text[0] === '{' && text[text.length - 1] === '}';
  tokens = tokens.map((token, index) => {
    if (index % 2 === 0) {
      return token;
    } else if (token[0] === '\\') {
      let [tag, attributes] = richTextMappings[token.slice(1, -1)];

      if (tag) {
        closingTags.push(`</${tag}>`);
        return !attributes ? `<${tag}>` : `<${tag} ${attributes}>`;
      } else {
        closingTags.push('');
        return '';
      }
    } else if (token === '{') {
      closingTags.push('</span>');
      return '<span class="nocase">';
    } else if (token === '}') {
      if (closingTags.length === 1 && index !== tokens.length - 2) {
        hasTopLevelTag = false;
      }

      return closingTags.pop();
    }
  });

  if (hasTopLevelTag) {
    tokens.splice(0, 2);
    tokens.splice(-2, 2);
  }

  return tokens.join('');
};

const propMap = {
  address: 'publisher-place',
  author: true,
  booktitle: 'container-title',
  chapter: 'chapter-number',
  doi: 'DOI',
  date: 'issued',
  edition: true,
  editor: true,
  type: 'genre',
  howpublished: 'publisher',
  institution: 'publisher',
  isbn: 'ISBN',
  issn: 'ISSN',
  issue: 'issue',
  journal: 'container-title',
  language: true,
  location: 'publisher-place',
  note: true,
  number: 'issue',
  numpages: 'number-of-pages',
  pages: 'page',
  pmid: 'PMID',
  pmcid: 'PMCID',
  publisher: true,
  school: 'publisher',
  series: 'collection-title',
  title: true,
  url: 'URL',
  volume: true,
  year: 'issued:date-parts.0.0',
  month: 'issued:date-parts.0.1',
  day: 'issued:date-parts.0.2',
  crossref: false,
  keywords: false
};

const parseBibTeXProp = function (name, value) {
  if (!propMap.hasOwnProperty(name)) {
    _core.logger.unmapped('[plugin-bibtex]', 'property', name);

    return undefined;
  } else if (propMap[name] === false) {
    return undefined;
  }

  const cslProp = propMap[name] === true ? name : propMap[name];

  const cslValue = ((name, value) => {
    switch (name) {
      case 'author':
      case 'editor':
        return parseBibtexNameList(value);

      case 'issued':
        return parseBibtexDate(value);

      case 'issued:date-parts.0.1':
        return parseFloat(value) ? value : months.findIndex(month => month.test(value)) + 1;

      case 'page':
        return value.replace(/[—–]/, '-');

      case 'collection-title':
      case 'container-title':
      case 'note':
      case 'publisher':
      case 'publisher-place':
      case 'title':
        return parseBibtexRichText(value);

      default:
        return value.replace(/[{}]/g, '');
    }
  })(cslProp, value);

  return [cslProp, cslValue];
};

exports.default = exports.parse = parseBibTeXProp;