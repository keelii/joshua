var rework = require('rework')
var pureGrids = require('./rework-pure-grids.js')

// [5, 24]
var css = rework('').use(pureGrids.units([5, 12], {
    includeOldIEWidths: false,
    selectorPrefix: '.col-',
    mediaQueries: {
        sm: 'screen and (min-width: $breakpoint-sm)',
        md: 'screen and (min-width: $breakpoint-md)',
        lg: 'screen and (min-width: $breakpoint-lg)',
        xl: 'screen and (min-width: $breakpoint-xl)',
    }
})).toString()

console.log(css)
