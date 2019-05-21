import { compile } from './js/compiler.js'

;(function(config, window, document) {
    let cfg = Object.assign({
        namespace: 'w',
        init: true,
        toastAutoCloseTimeout: 5000
    }, config)

    let ns = cfg.namespace
    let w = null
    let d = document

    if (window[ns]) throw new Error(`Global variable [${ns}] is already defined.`)
    w = ns === 'global' ? window : {}

    /* Lang */
    // w.isStr = o => typeof o === 'string'

    /* Utils */
    w.toArr = o => o.length ? o : [o]
    w.isSel = str => /\s|:|\*|\[|\]|\^|~|\+|>/.test(str)

    /* DOM */
    // Query
    w.id  = (id, ctx) => (ctx || d).getElementById(id)
    w.one = (sel, ctx) => (ctx || d).querySelector(sel)
    w.all = (sel, ctx) => (ctx || d).querySelectorAll(sel)

    // Node
    w.rm = (el) => el.remove()
    w.eq = (sel, idx, ctx) => w.all(sel, ctx)[idx]

    // Class
    w.hsClass = (el, cName) => el.classList && el.classList.contains(cName)
    w.tgClass = (el, cName, force) => w.toArr(el).forEach(e => e.classList.toggle(cName, force))
    w.adClass = (el, ...cName) => w.toArr(el).forEach(e => e.classList.add(...cName))
    w.rpClass = (el, ...args) => w.toArr(el).forEach(e => e.replace(...args))
    w.rmClass = (el, ...cName) => w.toArr(el).forEach(e => e.classList.remove(...cName))

    // Data
    w.data   = (el, key) => el.dataset && el.dataset[key]
    w.hsData = (el, key) => w.data(el, key) !== undefined

    // Attribute
    w.attr   = (el, key) => el.getAttribute(key)
    w.hsAttr = (el, key) => el.hasAttribute(key)
    w.stAttr = (el, key, value) => w.toArr(el).forEach(e => e.setAttribute(key, value))
    w.rmAttr = (el, key) => w.toArr(el).forEach(e => e.removeAttribute(key))
    w.tgAttr = (el, key) => w.hsAttr(el, key) ? w.rmAttr(el, key) : w.stAttr(el, key, true)

    /* Event */
    w.adEvent = (el, ...args) => el.addEventListener(...args)
    w.rmEvent = (el, ...args) => el.removeEventListener(...args)

    /* Functions */
    w.delay = (ms, fn, ...args) => {
        return setTimeout(() => fn(...args), ms)
    }

    // UI Component init
    w.toast = (content, type, pos, autoClose=true) => {
        let el = d.createElement('div')
        el.className = `toast ${pos||'center'}`
        el.setAttribute('data-action', 'rmClass("show")delay(100,fn:rm())')
        el.innerHTML = `<span class="message ${type||''}" data-click>${content}</span>`
        d.body.appendChild(el)

        let timer = null
        let open = () => w.delay(100, () => w.adClass(el, 'show'))
        let close = () => {
            timer = w.delay(cfg.toastAutoCloseTimeout, () => {
                w.rmClass(el, 'show')
                w.delay(100, () => w.rm(el))
            })
        }
        el.onmouseenter = () => clearTimeout(timer)
        open()
        if (autoClose) close()
        return { open, close }
    }
    w.dialog = (el) => {
        setAttr(el, 'open', true)
    }

    function getSelector(ns, type) {
        let key = ns ? 'from' : type
        return `[data-${key}${ns?`="${ns}"`:''}]`
    }
    function getSameAncestor(node, namespace) {
        let parent = node.parentNode
        if (!parent) return null

        while(parent) {
            let actions = w.hsData(parent, 'action')
                ? parent
                : w.one(getSelector(namespace, 'action'), parent)
            if (actions) {
                return parent
            } else {
                return getSameAncestor(parent)
            }
        }
    }
    function findIndex(list, node) {
        let index = null
        list.forEach((n, idx) => {
            if (n.isEqualNode(node)) index = idx
        })
        return index
    }
    function clickAction(target) {
        // Event namespace
        let ns = w.data(target, 'click')
        // Ancestor element
        let ancestor = getSameAncestor(target, ns)

        if (ancestor) {
            let triggers = w.all(getSelector(ns, 'click') , ancestor)
            let actions  = w.hsData(ancestor, 'action') ? [ancestor] : w.all(getSelector(ns, 'action') , ancestor)

            if (triggers.length) {
                let INDEX = findIndex(triggers, target) + 1
                let context = actions[0]

                // External temp function mapping
                // example:
                // __rmClass("ul li", "active"); __adClass(w._eq("ul li", 2), "active")
                let __ = {}
                // runtime selector or a string detection
                let get = (str, ...args) => {
                    let isSel = w.isSel(str)
                    let arg = isSel ? args : [str, ...args]
                    return [
                        isSel ? w.all(str, context) : context,
                        ...arg
                    ]
                }
                __.eq = (sel, idx) => w.eq(sel, idx, context)
                __.rm = (el) => el ? w.rm(w.all(el, context)) : w.rm(context)
                __.rmClass = (sel, ...args) => w.rmClass(...get(sel, ...args))
                __.adClass = (sel, ...args) => w.adClass(...get(sel, ...args))
                __.tgClass = (t, force) => w.tgClass(context, t, force)
                __.rmAttr = (sel, ...args) => w.rmAttr(...get(sel, ...args))
                __.stAttr = (sel, ...args) => w.stAttr(...get(sel, ...args))
                __.tgAttr = (t) => w.tgAttr(context, t)
                __.delay = w.delay

                let actionInput = w.data(actions[0], 'action')
                let code = compile(actionInput.replace(/INDEX/g, INDEX))

                // for test
                if (/debug/.test(location.href)) {
                    w.__ = __
                    console.log(`INDEX: ${INDEX}\nAction: ${code}\nAncestor: %o\nContext: %o`, ancestor, context)
                }

                try {
                    // let execute = new Function('p1', 'p2', code)
                    // execute(null, null)
                    eval(code)
                } catch(e) {
                    console.error('Execute code error.', e)
                    console.log(code)
                }
            }
        } else {
            console.error('Can`t find action target.')
        }
    }
    function handleAction(type, target, fn) {
        if (w.hsData(target, type)) {
            fn(target)
        }
    }

    function domReady() {
        w.adEvent(document, 'click', ({target}) => handleAction('click', target, clickAction))
    }

    if (cfg.init) {
        // When dom ready, bind default action to triggers.
        w.adEvent(window, 'DOMContentLoaded', domReady)
    }

    window[ns] = w

})(window.JOSHUA_CONFIG || {}, window, document)

