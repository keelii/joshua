const { describe, it } = require('mocha')
const assert = require('assert')
const { tokenizer, parser } = require('./compiler.cjs.js')

const parse = (input) => parser(tokenizer(input))

describe('lambda compiler', function() {
    describe('tokenizer', function() {
        it('should return correct token length', function() {
            assert.deepStrictEqual(tokenizer('add(1,2)').length, 5)
            assert.deepStrictEqual(tokenizer('add(1,plus(1))').length, 8)
            assert.deepStrictEqual(tokenizer('add(1,plus(1, fn:add(1)))').length, 13)
            assert.deepStrictEqual(tokenizer('add(1,plus(1, fn:add(foo, bar)))').length, 14)
        })
        it('should return correct token type', function() {
            assert.deepStrictEqual(tokenizer("'test'")[0], { type: 'string', value: 'test' })

            assert.deepStrictEqual(tokenizer('add(1,2)')[0].type, 'name')
            assert.deepStrictEqual(tokenizer('add(1,2)')[1].type, 'paren')
            assert.deepStrictEqual(tokenizer('add(1,2)')[2].type, 'number')
            assert.deepStrictEqual(tokenizer('add(1,2)')[2].type, tokenizer('add(1,2)')[3].type)
            assert.deepStrictEqual(tokenizer('add(1,2)')[4].type, 'paren')
            assert.deepStrictEqual(tokenizer('add(self)')[2].type, 'keyword')
            assert.deepStrictEqual(tokenizer('add(fn:plus(self))')[5].type, 'keyword')

            assert.deepStrictEqual(tokenizer('add(1,plus(1, fn:add(1)))')[6].type, 'lambda')
            assert.deepStrictEqual(tokenizer('add(1,plus(1, fn:add(1)))')[7].type, 'name')
            assert.deepStrictEqual(tokenizer('add(1,plus(1, fn:add(foo, bar)))')[10].type, 'name')
        })
        it('should return correct token value', function() {
            assert.deepStrictEqual(tokenizer('add(1, str)')[0].value, 'add')
            assert.deepStrictEqual(tokenizer('add(1, str)')[1].value, '(')
            assert.deepStrictEqual(tokenizer('add(1, str)')[2].value, '1')
            assert.deepStrictEqual(tokenizer('add(1, str)')[3].value, 'str')
            assert.deepStrictEqual(tokenizer('add(1, str)')[4].value, ')')

            assert.deepStrictEqual(tokenizer('add(1,plus(1, fn:add(1)))')[6].value, 'fn')
            assert.deepStrictEqual(tokenizer('add(1,plus(1, fn:add(1)))')[7].value, 'add')
        })
    })
    describe('parser', function() {
        it('ast should return correct array', function() {
            assert.deepStrictEqual(parse('add(str,2)').type, 'Program')
            assert.deepStrictEqual(parse('add(str,2)').body.length, 1)
            assert.deepStrictEqual(parse('add(str,2)plus(2,1)').body.length, 2)
            assert.deepStrictEqual(parse('add(str,2)plus(2,1)').body[0].params.length, 2)
        })
        it('ast should return correct node value', function() {
            assert.deepStrictEqual(parse('add(str,2)').body[0].type, 'CallExpression')
            assert.deepStrictEqual(parse('add(str,2)').body[0].params[0], {'type': 'StringLiteral', 'value': 'str'})
            assert.deepStrictEqual(parse('add(str,2)').body[0].params[1], {'type': 'NumberLiteral', 'value': '2'})
            assert.deepStrictEqual(parse('add(str,2)plus(2,1)').body[1].name, 'plus')
            assert.deepStrictEqual(parse('add(str,2)plus(2,1)').body[1].params[1].value, '1')
            assert.deepStrictEqual(parse('add(str,2)plus(2,fn:rm(1))').body[1].params[1].type, 'LambdaExpression')
            assert.deepStrictEqual(parse('add(str,2)plus(2,fn:rm(1))').body[1].params[1].name, 'rm')
            assert.deepStrictEqual(parse('add(str,2)plus(2,fn:rm(1))').body[1].params[1].params.length, 1)
            assert.deepStrictEqual(parse('add(str,2)plus(2,fn:rm(1))').body[1].params[1].params[0].value, '1')
            assert.deepStrictEqual(parse('fn:add(foo, 1)').body[0].params[0], {"type": "StringLiteral", "value": "foo"})
            assert.deepStrictEqual(parse('fn:add(foo, 1)').body[0].params[1], {"type": "NumberLiteral", "value": "1"})

            assert.deepStrictEqual(parse('add(self)').body[0].params[0], { type: 'KeywordLiteral', value: 'self' })
            assert.deepStrictEqual(parse('fn:add(self)').body[0].params[0], { type: 'KeywordLiteral', value: 'self' })
        })
    })
})
