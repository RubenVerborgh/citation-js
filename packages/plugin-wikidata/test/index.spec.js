/* eslint-env mocha */

const assert = require('assert')
const { plugins } = require('../../../test/api')(require('@citation-js/core'))
require('../src/')

const data = require('./data')

describe('input', function () {
  for (let type in data) {
    describe(type, function () {
      it('is registered', function () {
        assert(plugins.input.has(type))
      })

      for (let name of Object.keys(data[type])) {
        let [input, expected, { link, opts } = {}] = data[type][name]
        describe(name, function () {
          it('parses type', function () {
            assert.strictEqual(plugins.input.type(input), type)
          })
          it('parses data', async function () {
            let method = link ? plugins.input.chainLink : plugins.input.chain
            assert.deepStrictEqual(
              method(input, Object.assign({ generateGraph: false }, opts || {})),
              expected
            )
          })
          it('parses data async', async function () {
            let method = link ? plugins.input.chainLinkAsync : plugins.input.chainAsync
            assert.deepStrictEqual(
              await method(input, Object.assign({ generateGraph: false }, opts || {})),
              expected
            )
          })
        })
      }
    })
  }
})

describe('configuration', function () {
  describe('langs', function () {
    const qid = 'Q1'
    const config = plugins.config.get('@wikidata')

    it('changes default', function () {
      config.langs.unshift('ja')
      assert.strictEqual(
        plugins.input.chain(qid)[0].title,
        '宇宙'
      )
      config.langs.shift()
    })
    it('falls back', function () {
      config.langs.unshift('foo')
      assert.strictEqual(
        plugins.input.chain(qid)[0].title,
        'Universe'
      )
      config.langs.shift()
    })
    it('deals with no available labels', function () {
      const langs = config.langs
      config.langs = []
      plugins.input.chain(qid)
      config.langs = langs
    })
  })
})
