"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parse = parse;
exports.default = exports.bibtexGrammar = void 0;

var _core = require("@citation-js/core");

var _moo = _interopRequireDefault(require("moo"));

var constants = _interopRequireWildcard(require("./constants"));

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function () { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

const identifier = /[a-zA-Z][a-zA-Z0-9_-]*/;
const whitespace = {
  comment: /%.*/,
  whitespace: {
    match: /\s+/,
    lineBreaks: true
  }
};
const text = {
  command: /\\(?:[a-z]+|.) */,
  lbrace: {
    match: '{',
    push: 'bracedLiteral'
  },
  mathShift: {
    match: '$',
    push: 'mathLiteral'
  },
  whitespace: {
    match: /\s+/,
    lineBreaks: true
  }
};

const lexer = _moo.default.states({
  main: {
    junk: {
      match: /@[cC][oO][mM][mM][eE][nN][tT].+|[^@]+/,
      lineBreaks: true
    },
    at: {
      match: '@',
      push: 'entry'
    }
  },
  entry: _objectSpread({}, whitespace, {
    otherEntryType: {
      match: /[sS][tT][rR][iI][nN][gG]|[pP][rR][eE][aA][mM][bB][lL][eE]/,
      next: 'otherEntryContents'
    },
    dataEntryType: {
      match: identifier,
      next: 'dataEntryContents'
    }
  }),
  otherEntryContents: _objectSpread({}, whitespace, {
    lbrace: {
      match: /[{(]/,
      next: 'fields'
    }
  }),
  dataEntryContents: _objectSpread({}, whitespace, {
    lbrace: {
      match: /[{(]/,
      next: 'dataEntryContents'
    },
    label: /[^,\s]+/,
    comma: {
      match: ',',
      next: 'fields'
    }
  }),
  fields: _objectSpread({}, whitespace, {
    identifier,
    number: /-?\d+/,
    hash: '#',
    equals: '=',
    comma: ',',
    quote: {
      match: '"',
      push: 'quotedLiteral'
    },
    lbrace: {
      match: '{',
      push: 'bracedLiteral'
    },
    rbrace: {
      match: /[})]/,
      pop: true
    }
  }),
  quotedLiteral: _objectSpread({}, text, {
    quote: {
      match: '"',
      pop: true
    },
    text: /[^{$"\s\\]+/
  }),
  bracedLiteral: _objectSpread({}, text, {
    rbrace: {
      match: '}',
      pop: true
    },
    text: /[^{$}\s\\]+/
  }),
  mathLiteral: _objectSpread({}, text, {
    mathShift: {
      match: '$',
      pop: true
    },
    script: /[\^_]/,
    text: /[^{$}\s\\^_]+/
  })
});

const delimiters = {
  '(': ')',
  '{': '}'
};
const bibtexGrammar = new _core.util.Grammar({
  Main() {
    let entries = [];

    while (true) {
      while (this.matchToken('junk')) {
        this.consumeToken('junk');
      }

      if (this.matchEndOfFile()) {
        break;
      }

      entries.push(this.consumeRule('Entry'));
    }

    return entries.filter(Boolean);
  },

  _() {
    let oldToken;

    while (oldToken !== this.token) {
      oldToken = this.token;
      this.consumeToken('whitespace', true);
      this.consumeToken('comment', true);
    }
  },

  Entry() {
    this.consumeToken('at');
    this.consumeRule('_');
    const type = (this.matchToken('otherEntryType') ? this.consumeToken('otherEntryType') : this.consumeToken('dataEntryType')).value.toLowerCase();
    this.consumeRule('_');
    const openBrace = this.consumeToken('lbrace').value;
    this.consumeRule('_');
    let result;

    if (type === 'string') {
      const [key, value] = this.consumeRule('Field');
      this.state.strings[key] = value;
    } else if (type === 'preamble') {
      this.consumeRule('Expression');
    } else {
      const label = this.consumeToken('label').value;
      this.consumeRule('_');
      this.consumeToken('comma');
      this.consumeRule('_');
      const properties = this.consumeRule('EntryBody');
      result = {
        type,
        label,
        properties
      };
    }

    this.consumeRule('_');
    const closeBrace = this.consumeToken('rbrace');

    if (closeBrace !== delimiters[openBrace]) {
      _core.logger.warn('[plugin-bibtex]', `entry started with "${openBrace}", but ends with "${closeBrace}"`);
    }

    return result;
  },

  EntryBody() {
    let properties = {};

    while (this.matchToken('identifier')) {
      let [field, value] = this.consumeRule('Field');
      properties[field] = value;
      this.consumeRule('_');

      if (this.consumeToken('comma', true)) {
        this.consumeRule('_');
      } else {
        break;
      }
    }

    return properties;
  },

  Field() {
    const field = this.consumeToken('identifier');
    this.consumeRule('_');
    this.consumeToken('equals');
    this.consumeRule('_');
    const value = this.consumeRule('Expression');
    return [field, value];
  },

  Expression() {
    let output = this.consumeRule('ExpressionPart');
    this.consumeRule('_');

    while (this.matchToken('hash')) {
      this.consumeToken('hash');
      this.consumeRule('_');
      output += this.consumeRule('ExpressionPart').toString();
      this.consumeRule('_');
    }

    return output;
  },

  ExpressionPart() {
    if (this.matchToken('identifier')) {
      return this.state.strings[this.consumeToken('identifier').value] || '';
    } else if (this.matchToken('number')) {
      return this.consumeToken('number').value;
    } else if (this.matchToken('quote')) {
      return this.consumeRule('QuoteString');
    } else if (this.matchToken('lbrace')) {
      return this.consumeRule('BracketString');
    }
  },

  QuoteString() {
    let output = '';
    this.consumeToken('quote');

    while (!this.matchToken('quote')) {
      output += this.consumeRule('Text');
    }

    this.consumeToken('quote');
    return output;
  },

  BracketString() {
    let output = '';
    this.consumeToken('lbrace');

    while (!this.matchToken('rbrace')) {
      output += this.consumeRule('Text');
    }

    this.consumeToken('rbrace');
    return output;
  },

  BracketText() {
    let output = '';
    this.consumeToken('lbrace');

    while (this.matchToken('command')) {
      output += this.consumeRule('Command');
    }

    if (!this.matchToken('rbrace')) {
      do {
        output += this.consumeRule('Text');
      } while (!this.matchToken('rbrace'));

      output = `{${output}}`;
    }

    this.consumeToken('rbrace');
    return output;
  },

  MathString() {
    let output = '';
    this.consumeToken('mathShift');

    while (!this.matchToken('mathShift')) {
      if (this.matchToken('script')) {
        const script = this.consumeToken('script').value;
        const text = this.consumeRule('Text').replace(/^{|}$/g, '');
        output += constants.mathScripts[script][text[0]] + text.slice(1);
      } else {
        output += this.consumeRule('Text');
      }
    }

    this.consumeToken('mathShift');
    return output;
  },

  Text() {
    let raw;

    if (this.matchToken('lbrace')) {
      raw = this.consumeRule('BracketText');
    } else if (this.matchToken('mathShift')) {
      raw = this.consumeRule('MathString');
    } else if (this.matchToken('whitespace')) {
      this.consumeToken('whitespace');
      raw = ' ';
    } else if (this.matchToken('command')) {
      raw = this.consumeRule('Command');
    } else {
      raw = this.consumeToken('text').value.replace(constants.ligaturePattern, ligature => constants.ligatures[ligature]);
    }

    return raw.normalize();
  },

  Command() {
    const command = this.consumeToken('command').value.slice(1).trim();

    if (command in constants.commands) {
      return constants.commands[command];
    } else if (command in constants.diacritics && !this.matchEndOfFile()) {
      if (this.matchToken('text')) {
        const text = this.consumeToken('text').value;
        return text[0] + constants.diacritics[command] + text.slice(1);
      } else {
        return this.consumeRule('Text').replace(/^{|}$/g, '') + constants.diacritics[command];
      }
    } else if (/^\W$/.test(command)) {
      return command;
    } else {
      return '\\' + command;
    }
  }

}, {
  strings: Object.assign({}, constants.defaultStrings)
});
exports.bibtexGrammar = bibtexGrammar;

function parse(text) {
  return bibtexGrammar.parse(lexer.reset(text));
}

var _default = parse;
exports.default = _default;