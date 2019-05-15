;(function(config, window, document) {
    let cfg = Object.assign({
        namespace: null
    }, config)

    let ns = cfg.namespace
    let w = window
    let d = document

    if (typeof ns === 'string') w = window[ns] = {}

    /* DOM */
    // Query
    w.get = (id) => d.getElementById(id)
    w.one = (sel) => d.querySelector(sel)
    w.all = (sel) => d.querySelectorAll(sel)
    w.remove = (el) => el.remove()

    // Classes
    w.hasClass = (el, cName) => el.classList && el.classList.contains(cName)
    w.addClass = (el, cName) => el.classList.add(cName)
    w.toggleClass = (el, cName) => el.classList.toggle(cName)
    w.removeClass = (el, cName) => el.classList.remove(cName)

    // Data
    w.data = (el, key) => el.dataset && el.dataset[key]
    w.hasData = (el, key) => w.data(el, key) !== undefined
    w.attr = (el, key) => el.getAttribute(key)
    w.hasAttr = (el, key) => el.hasAttribute(key)
    w.setAttr = (el, key, value) => el.setAttribute(key, value)
    w.removeAttr = (el, key) => el.removeAttribute(key)
    w.toggleAttr = (...args) => w.hasAttr(...args) ? w.removeAttr(...args) : w.setAttr(...args, true)

    /* Event */
    w.addEvent = (el, ...args) => el.addEventListener(...args)
    w.removeEvent = (el, ...args) => el.removeEventListener(...args)

    /* utils */
    w.delay = function(ms, fn, ...args) {
        return setTimeout(() => w[fn](this, ...args), ms)
    }

    w.execute = function(fn, ...args) {
        if (!w[fn]) return console.error(`[${fn}] is not a function.`)

        if (fn.includes('delay')) {
            w[fn].call(this, ...args)
        } else {
            w[fn](this, ...args)
        }
    }

    // UI Component init
    w.toast = (content, pos) => {
        let el = d.createElement('div')
        el.className = `toast ${pos}`
        el.innerHTML = `<span class="message" data-trigger="close">${content}</span>`
        d.body.appendChild(el)
        setTimeout(() => {
            addClass(el, 'show')
        }, 100)
    }
    w.dialog = (el) => {
        setAttr(el, 'open', true)
    }

    function clickAction(e) {
        let trigger = w.data(e.target, 'trigger')
        if (trigger !== undefined) {
            let target = (trigger !== '' && one(trigger)) || e.target.closest('[data-action]')
            let action = target && w.data(target, 'action')
            if (!target) {
                console.warn('Maybe you want add data-action to a DOM node?')
            }
            if (action) {
                action.split(',').forEach(act => {
                    w.execute.call(target, ...act.split(/\s+/g))
                })
            }
        }
    }

    function domReady() {
        w.addEvent(document, 'click', clickAction)
    }

    // When dom ready, bind default action to triggers.
    w.addEvent(window, 'DOMContentLoaded', domReady)

})(window.JOSHUA_CONFIG || {}, window, document)

