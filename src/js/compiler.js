/**
* A minimal compiler that interpret follow
* Inline Action Expression(IAE):
* 	 "add(1, 2);delay(100, fn: plus(3, 1))"
* to JavaScript runtime code:
*    add(1, 2)
*    delay(100, function() {
*        plus(3, 1)
*    })
*/
export function tokenizer(input) {
	let current = 0
	let tokens = []

	while (current < input.length) {

		let char = input[current]

		if (char === "'") {
			let value = ''
			current++
			char = input[current]
			while(char !== "'") {
				value += char
				current++
				char = input[current]
			}
			tokens.push({
				type: 'string',
				value: value
			})
			current++
			continue
		}

		if (char === '(') {
			tokens.push({
				type: 'paren',
				value: '('
			})
			current++
			continue
		}

		if (char === ')') {
			tokens.push({
				type: 'paren',
				value: ')'
			})
			current++
			continue
		}

		let WHITESPACE = /\s/
		if (WHITESPACE.test(char)) {
			current++
			continue
		}
		if (char === ',' || char === ';' || char === ':') {
			current++
			continue
		}

		let NUMBERS = /[0-9]/
		if (NUMBERS.test(char)) {
			let value = ''
			while(NUMBERS.test(char)) {
				value += char
				current++
				char = input[current]
			}
			tokens.push({
				type: 'number',
				value: value
			})
			continue
		}
		let LETTERS = /[a-z]|-|_|\$/i
		if (LETTERS.test(char)) {
			let value = ''
			while(LETTERS.test(char)) {
				value += char
				current++
				char = input[current]
			}
			if (value === 'fn') {
				tokens.push({
					type: 'lambda',
					value: value
				})
			} else if (value === 'self') {
				tokens.push({
					type: 'keyword',
					value: value
				})
			} else {
				tokens.push({
					type: 'name',
					value: value
				})
			}
			continue
		}


		throw new TypeError(`Unexcepted charactor "${char}".`)
	}
	return tokens
}

export function parser(tokens) {
	let current = 0
	let ast = {
		type: 'Program',
		body: []
	}

	function walk() {
		let token = tokens[current]

		if (token.type === 'string') {
			current++
			return {
				type: 'RawString',
				value: token.value
			}
		}
		if (token.type === 'keyword') {
			current++
			return {
				type: 'KeywordLiteral',
				value: token.value
			}
		}
		if (token.type === 'number') {
			current++
			return {
				type: 'NumberLiteral',
				value: token.value
			}
		}
		if(token.type === 'lambda') {
			token = tokens[++current]
			let node = {
				type: 'LambdaExpression',
				name: token.value,
				params: []
			}
			token = tokens[++current]
			// LambdaExpression 表达式
			if (token.type === 'paren' && token.value === '(') {
				// 跳过括号，方便取到函数名
				token = tokens[++current]

				while(
					(token.type !== 'paren') ||
					(token.type === 'paren' && token.value !== ')')
				) {
					node.params.push(walk())
					token = tokens[current]
				}

				current++
				return node
			} else {
				// // StringLiteral
				// return {
				// 	type: 'StringLiteral',
				// 	value: name
				// }
			}
		}

		if (token.type === 'name') {
			let name = token.value
			token = tokens[++current]
			// CallExpression 调用表达式   add  (  1  2  )
			if (token.type === 'paren' && token.value === '(') {
				// 跳过括号，方便取到函数名
				token = tokens[++current]
				let node = {
					type: 'CallExpression',
					name: name,
					params: []
				}

				while(
					(token.type !== 'paren') ||
					(token.type === 'paren' && token.value !== ')')
				) {
					node.params.push(walk())
					token = tokens[current]
				}

				current++
				return node
			} else {
				// StringLiteral
				return {
					type: 'StringLiteral',
					value: name
				}
			}
		}
	}

	while(current < tokens.length) {
		ast.body.push(walk())
	}

	return ast
}

export function codeGen(ast) {
	function traverseArray(arr, parent) {
		let result = ''
		if (parent.type === 'LambdaExpression') result += 'function() {\n'
		if (parent.name) {
			result += `__.${parent.name}(`
		}

		arr.forEach((child, idx) => {
			if (parent.name) {
				result += `${idx === 0 ? '': ', '}${traverseNode(child, parent)}`
			} else {
				result += `${idx === 0 ? '': '; '}${traverseNode(child, parent)}`
			}
		})

		if (parent.name) result += `)`
		if (parent.type === 'LambdaExpression') result += '\n}'
		return result
	}

	function traverseNode(node, parent) {
		if (node.type === 'Program') {
			return traverseArray(node.body, node)
		}
		if (node.type === 'CallExpression') {
			return traverseArray(node.params, node)
		}
		if (node.type === 'LambdaExpression') {
			return traverseArray(node.params, node)
		}
		if (node.type === 'KeywordLiteral') {
			return node.value
		}
		if (node.type === 'StringLiteral') {
			return node.value === 'INDEX'
				? node.value
				:`"${node.value}"`
		}
		if (node.type === 'RawString') {
			return `"${node.value}"`
		}
		if (node.type === 'NumberLiteral') {
			return node.value
		}
		throw new TypeError(node.type)
	}

	return traverseNode(ast, null)
}

export function compile(input) {
	let tokens = tokenizer(input)
	let ast    = parser(tokens)
	let out    = codeGen(ast)

	return out
}






