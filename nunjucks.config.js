const nunjucks = require('nunjucks')
const env = nunjucks.configure('./src/template', {
    watch: true,
    noCache: true
})

env.addFilter('selector', function(str) {
    return str === 'default' ? '' : '.' + str
})


module.exports = {
    env: env,
    data: {
        name: 'keelii',
        grid: {
            row: 'row',
            col: 'col',
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
                "datetime", "date", "datetime-local", "week", "month", "time",
            ]
        }
    }
}