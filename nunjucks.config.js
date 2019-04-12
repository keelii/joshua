const nunjucks = require('nunjucks')
const env = nunjucks.configure('./src/template', {
    watch: true,
    noCache: true
})
const data = {
    name: 'keelii',
    grid: {
        row: 'row',
        col: 'col',
        noGutter: 'no-gutter',
        breakpoints: [
            { prefix: 'sm', name: 'small' },
            { prefix: 'md', name: 'medium' },
            { prefix: 'lg', name: 'large' },
            { prefix: 'xl', name: 'x-large' },
            { prefix: 'default', name: 'default' },
        ]
    },
    input: {
        button: [
            "button", "reset", "submit", 
        ],
        interactive: [
            "checkbox", "radio", "range", "color",  "image", "file", "hidden",
        ],
        text: [
            "text",  "password", "number", "url", "search", "email", "tel", 
            "datetime", 
        ],
        time: [
            "date", "datetime-local", "week", "month", "time",
        ]
    }
}

env.addFilter('selector', (str) => str === 'default' ? '' : '.' + str)
env.addFilter('max', (arr, num) => arr.slice(0, num))
env.addFilter('midline', (str) => str.toLowerCase().replace(/\s/g, '-'))

/**
 * 删格行
{% Row gutter=false %}
    {% Col default=[1]%}
        anything
    {% endCol %}
{% endRow %}
*/
const RowTag = function(data) {
    this.tags = ['Row']

    this.parse = function(parser, nodes, lexer) {
        var token = parser.nextToken()

        var args = parser.parseSignature(null, true)
        parser.advanceAfterBlockEnd(token.value)

        var body = parser.parseUntilBlocks('endRow')

        parser.advanceAfterBlockEnd()

        return new nodes.CallExtension(this, 'run', args, [body])
    }

    this.run = function(context, kw, body) {
        let bodyStr = ''
        let cNames = [data.grid.row]

        if (typeof kw === 'function') {
            bodyStr = kw()
        } else {
            if (typeof body === 'function') bodyStr = body()
            if (kw.gutter === false) cNames.push(data.grid.noGutter)
        }

        return new nunjucks.runtime.SafeString(`<div class="${cNames.join(' ')}">${env.renderString(bodyStr, data)}</div>`)
    }
}
// 
/**
 * 删格列
{% Col default=[1,3], sm=[1], md=[1,2], lg=[1,3], xl=[1,6] %}
    anything
{% endCol %}
*/
const ColTag = function(data) {
    this.tags = ['Col']

    this.parse = function(parser, nodes, lexer) {
        var token = parser.nextToken()

        var args = parser.parseSignature(null, true)
        parser.advanceAfterBlockEnd(token.value)

        var body = parser.parseUntilBlocks('endCol')

        parser.advanceAfterBlockEnd()

        return new nodes.CallExtension(this, 'run', args, [body])
    }

    const getColumnClass = (type, sizes) => {
        return type === 'default' ?
            `${data.grid.col}-${sizes.join('-')}`
            : `${data.grid.col}-${type}-${sizes.join('-')}`
    }

    this.run = function(context, kw, body) {
        let bodyStr = ''
        let cNames = []

        if (typeof kw === 'function') {
            bodyStr = kw()
        } else {
            if (typeof body === 'function') bodyStr = body()

            data.grid.breakpoints.forEach(({prefix}) => {
                if (kw[prefix]) {
                    cNames.push(
                        getColumnClass(prefix, 
                            kw[prefix].filter(d => typeof d === 'number'))
                    )
                }
            })
        }

        return new nunjucks.runtime.SafeString(`<div class="${cNames.join(' ')}">${env.renderString(bodyStr, data)}</div>`)
    }
}

env.addExtension('Row', new RowTag(data))
env.addExtension('Col', new ColTag(data))

module.exports = { env, data }