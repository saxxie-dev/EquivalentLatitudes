
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    function is_date(obj) {
        return Object.prototype.toString.call(obj) === '[object Date]';
    }

    function tick_spring(ctx, last_value, current_value, target_value) {
        if (typeof current_value === 'number' || is_date(current_value)) {
            // @ts-ignore
            const delta = target_value - current_value;
            // @ts-ignore
            const velocity = (current_value - last_value) / (ctx.dt || 1 / 60); // guard div by 0
            const spring = ctx.opts.stiffness * delta;
            const damper = ctx.opts.damping * velocity;
            const acceleration = (spring - damper) * ctx.inv_mass;
            const d = (velocity + acceleration) * ctx.dt;
            if (Math.abs(d) < ctx.opts.precision && Math.abs(delta) < ctx.opts.precision) {
                return target_value; // settled
            }
            else {
                ctx.settled = false; // signal loop to keep ticking
                // @ts-ignore
                return is_date(current_value) ?
                    new Date(current_value.getTime() + d) : current_value + d;
            }
        }
        else if (Array.isArray(current_value)) {
            // @ts-ignore
            return current_value.map((_, i) => tick_spring(ctx, last_value[i], current_value[i], target_value[i]));
        }
        else if (typeof current_value === 'object') {
            const next_value = {};
            for (const k in current_value) {
                // @ts-ignore
                next_value[k] = tick_spring(ctx, last_value[k], current_value[k], target_value[k]);
            }
            // @ts-ignore
            return next_value;
        }
        else {
            throw new Error(`Cannot spring ${typeof current_value} values`);
        }
    }
    function spring(value, opts = {}) {
        const store = writable(value);
        const { stiffness = 0.15, damping = 0.8, precision = 0.01 } = opts;
        let last_time;
        let task;
        let current_token;
        let last_value = value;
        let target_value = value;
        let inv_mass = 1;
        let inv_mass_recovery_rate = 0;
        let cancel_task = false;
        function set(new_value, opts = {}) {
            target_value = new_value;
            const token = current_token = {};
            if (value == null || opts.hard || (spring.stiffness >= 1 && spring.damping >= 1)) {
                cancel_task = true; // cancel any running animation
                last_time = now();
                last_value = new_value;
                store.set(value = target_value);
                return Promise.resolve();
            }
            else if (opts.soft) {
                const rate = opts.soft === true ? .5 : +opts.soft;
                inv_mass_recovery_rate = 1 / (rate * 60);
                inv_mass = 0; // infinite mass, unaffected by spring forces
            }
            if (!task) {
                last_time = now();
                cancel_task = false;
                task = loop(now => {
                    if (cancel_task) {
                        cancel_task = false;
                        task = null;
                        return false;
                    }
                    inv_mass = Math.min(inv_mass + inv_mass_recovery_rate, 1);
                    const ctx = {
                        inv_mass,
                        opts: spring,
                        settled: true,
                        dt: (now - last_time) * 60 / 1000
                    };
                    const next_value = tick_spring(ctx, last_value, value, target_value);
                    last_time = now;
                    last_value = value;
                    store.set(value = next_value);
                    if (ctx.settled) {
                        task = null;
                    }
                    return !ctx.settled;
                });
            }
            return new Promise(fulfil => {
                task.promise.then(() => {
                    if (token === current_token)
                        fulfil();
                });
            });
        }
        const spring = {
            set,
            update: (fn, opts) => set(fn(target_value, value), opts),
            subscribe: store.subscribe,
            stiffness,
            damping,
            precision
        };
        return spring;
    }

    const topReferenceYr = 0.160875;
    const topReferenceLatitude = 71.29;
    const bottomReferenceYr = 0.983905;
    const bottomReferenceLatitude = 7.208;

    const deltaYr = bottomReferenceYr - topReferenceYr;
    const deltaLatitude = bottomReferenceLatitude - topReferenceLatitude;

    const leftReferenceXr = .002436;
    const leftReferenceLongitude = -168.101;
    const rightReferenceXr = .986429;
    const rightReferenceLongitude = -11.313;

    const deltaXr = rightReferenceXr - leftReferenceXr;
    const deltaLongitude = rightReferenceLongitude - leftReferenceLongitude;

    const yrToLat = (yr) => {
      return topReferenceLatitude + deltaLatitude / deltaYr * (yr - topReferenceYr);
    };
    const latToYr = (lat) => {
      return topReferenceYr + deltaYr / deltaLatitude * (lat - topReferenceLatitude);
    };
    const xrToLong = (xr) => {
      return leftReferenceLongitude + deltaLongitude / deltaXr * (xr - leftReferenceXr);
    };
    const longToXr = (long) => {
      return leftReferenceXr + deltaXr / deltaLongitude * (long - leftReferenceLongitude);
    };

    const cityToCoords = {
      Lisbon: [38.736, -123.29],
      Paris: [48.864, -122.5],
      London: [51.5072, -126.8],
      Oslo: [59.9127, -135.4],
      ["Saint Petersburg"]: [59.9311, -152.9],
      Zurich: [47.3769, -119],
      Baghdad: [33.3153, -113],
      Mecca: [21.4225, -103.5],
      Tehran: [35.7000, -107],
      Moscow: [55.7558, -116],
      Donetsk: [48.0089, -97.5],
      Jerusalem: [31.7789, -115.6],
      ["Petropavlovsk-Kamchatskiy"]: [53.1, -59.6],
      Magadan: [59.55, -69.2],
      Kolkata: [22.5727, -98.5],
      Kunming: [25.0433, -102],
      Chongqing: [29.56, -99],
      Beijing: [39.9042, -80],
      Harbin: [45.7500, -74],
      Almaty: [43.238, -103],
      Mumbai: [19.0758, -105],
      Kabul: [34.5328, -100],
      Bangkok: [13.7563, -87.2],
      ["Hong Kong"]: [22.3193, -81.6],
      Shanghai: [31.2304, -81],
      Tokyo: [35.6764, -76.4],
      Pyongyang: [39.0738, -74.3],
      Manila: [14.5958, -60.9],
      Ulaanbaatar: [47.9221, -105],
      Novosibirsk: [55.0333, -100],
      Hyderabad: [17.3617, -90],
      Dubai: [25.2048, -79.85],
      Yakutsk: [62.0272, -109],
      Murmansk: [68.9667, -164],
      Florence: [43.7714, -123],
      Vladivostok: [43.1167, -70.5],
      Volgograd: [48.7086, -113.5],
      Samarkand: [39.6547, -115],
      Timbuktu: [16.7733, -97],
      ["Addis Ababa"]: [8.97, -83.23],
      Madrid: [40.4169, -121],
      Dublin: [53.3497, -132.2],
      Delhi: [28.68, -103.5],
      Beirut: [33.63, -119.8],
      ["Xi'An"]: [34.33, -91.2],
      Gibraltar: [36.1, -121.7],
      Karachi: [24.76, -108],
      Shenyang: [41.79, -82.6],
      Hanoi: [21.01, -76.8],
      Sanya: [18.21, -68.9],
      Wuhan: [30.5928, -93.6],
      Nanjing: [32.058, -87],
      Norilsk: [69.3558, -92.5]
    };

    /* src\CityMark.svelte generated by Svelte v3.59.2 */
    const file$1 = "src\\CityMark.svelte";

    function create_fragment$2(ctx) {
    	let div2;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div2_style_value;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			t1 = text(/*cityName*/ ctx[0]);
    			attr_dev(div0, "class", "point svelte-1baq3ad");
    			add_location(div0, file$1, 41, 2, 753);
    			attr_dev(div1, "class", "label svelte-1baq3ad");
    			add_location(div1, file$1, 42, 2, 776);
    			attr_dev(div2, "class", "city svelte-1baq3ad");

    			attr_dev(div2, "style", div2_style_value = `top: ${latToYr(cityToCoords[/*cityName*/ ctx[0]][0]) * 100}%;
  left: ${longToXr(cityToCoords[/*cityName*/ ctx[0]][1]) * 100}%
`);

    			add_location(div2, file$1, 37, 0, 617);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, t1);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*cityName*/ 1) set_data_dev(t1, /*cityName*/ ctx[0]);

    			if (dirty & /*cityName*/ 1 && div2_style_value !== (div2_style_value = `top: ${latToYr(cityToCoords[/*cityName*/ ctx[0]][0]) * 100}%;
  left: ${longToXr(cityToCoords[/*cityName*/ ctx[0]][1]) * 100}%
`)) {
    				attr_dev(div2, "style", div2_style_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('CityMark', slots, []);
    	let { cityName } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (cityName === undefined && !('cityName' in $$props || $$self.$$.bound[$$self.$$.props['cityName']])) {
    			console.warn("<CityMark> was created without expected prop 'cityName'");
    		}
    	});

    	const writable_props = ['cityName'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<CityMark> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('cityName' in $$props) $$invalidate(0, cityName = $$props.cityName);
    	};

    	$$self.$capture_state = () => ({
    		cityName,
    		latToYr,
    		longToXr,
    		cityToCoords
    	});

    	$$self.$inject_state = $$props => {
    		if ('cityName' in $$props) $$invalidate(0, cityName = $$props.cityName);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [cityName];
    }

    class CityMark extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { cityName: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "CityMark",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get cityName() {
    		throw new Error("<CityMark>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set cityName(value) {
    		throw new Error("<CityMark>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Pane.svelte generated by Svelte v3.59.2 */

    const { Object: Object_1 } = globals;
    const file = "src\\Pane.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    // (165:6) {#each Object.keys(cityToCoords) as cityName}
    function create_each_block(ctx) {
    	let citymark;
    	let current;

    	citymark = new CityMark({
    			props: { cityName: /*cityName*/ ctx[19] },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(citymark.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(citymark, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(citymark.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(citymark.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(citymark, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(165:6) {#each Object.keys(cityToCoords) as cityName}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div1;
    	let div0;
    	let img;
    	let img_src_value;
    	let t;
    	let div0_style_value;
    	let current;
    	let mounted;
    	let dispose;
    	add_render_callback(/*onwindowresize*/ ctx[11]);
    	let each_value = Object.keys(cityToCoords);
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(img, "draggable", "false");
    			set_style(img, "height", "100%");
    			if (!src_url_equal(img.src, img_src_value = "/north-america-equirectangular.svg")) attr_dev(img, "src", img_src_value);
    			add_location(img, file, 159, 6, 4261);

    			attr_dev(div0, "style", div0_style_value = `
      transform: translate(${/*$offset*/ ctx[6].x * /*screenW*/ ctx[1]}px, ${/*$offset*/ ctx[6].y * /*screenH*/ ctx[0]}px);
      height:${/*mapHeight*/ ctx[9](/*zoom*/ ctx[2])}px;
      width: max-content;
      overflow: visible;
    `);

    			attr_dev(div0, "class", "svelte-q3vu9i");
    			add_location(div0, file, 152, 2, 4061);
    			attr_dev(div1, "class", "svelte-q3vu9i");
    			add_location(div1, file, 69, 0, 1701);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div0, t);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div0, null);
    				}
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(window, "resize", /*onwindowresize*/ ctx[11]),
    					listen_dev(img, "load", /*load_handler*/ ctx[12], false, false, false, false),
    					listen_dev(div1, "mousedown", /*mousedown_handler*/ ctx[13], false, false, false, false),
    					listen_dev(div1, "mouseup", /*onDragStop*/ ctx[8], false, false, false, false),
    					listen_dev(div1, "mouseleave", /*onDragStop*/ ctx[8], false, false, false, false),
    					listen_dev(div1, "mousemove", /*mousemove_handler*/ ctx[14], false, false, false, false),
    					listen_dev(div1, "wheel", /*wheel_handler*/ ctx[15], false, false, false, false),
    					listen_dev(div1, "touchstart", /*touchstart_handler*/ ctx[16], false, false, false, false),
    					listen_dev(div1, "touchmove", /*touchmove_handler*/ ctx[17], false, false, false, false),
    					listen_dev(div1, "touchend", /*onDragStop*/ ctx[8], { passive: true }, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*Object, cityToCoords*/ 0) {
    				each_value = Object.keys(cityToCoords);
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*$offset, screenW, screenH, zoom*/ 71 && div0_style_value !== (div0_style_value = `
      transform: translate(${/*$offset*/ ctx[6].x * /*screenW*/ ctx[1]}px, ${/*$offset*/ ctx[6].y * /*screenH*/ ctx[0]}px);
      height:${/*mapHeight*/ ctx[9](/*zoom*/ ctx[2])}px;
      width: max-content;
      overflow: visible;
    `)) {
    				attr_dev(div0, "style", div0_style_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $offset;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Pane', slots, []);
    	let screenH, screenW;
    	let zoom = 1;
    	let dragStart = undefined;
    	let offset = spring({ x: 0, y: 0 }, { stiffness: 0.2, damping: 0.4 });
    	validate_store(offset, 'offset');
    	component_subscribe($$self, offset, value => $$invalidate(6, $offset = value));
    	let mapRatio;
    	let initialTouchDistance;

    	const onDragStop = () => {
    		$$invalidate(3, dragStart = undefined);
    		offset.set(normalizePosition({ x: $offset.x, y: $offset.y }, zoom));
    	};

    	const mapHeight = zoom => 500 * zoom;

    	const normalizeDimension = (mapD, screenD, margin, i) => {
    		const margin0 = Math.max(margin, i);
    		const margin1 = Math.max(margin, screenD - mapD - i);

    		if (margin0 > margin || margin1 > margin) {
    			if (mapD > screenD) {
    				if (margin0 > margin) {
    					return margin;
    				} else {
    					return screenD - mapD - margin;
    				}
    			} else {
    				return (screenD - mapD) / 2;
    			}
    		}

    		return i;
    	};

    	const normalizePosition = ({ x, y }, zoom) => {
    		const mapH = mapHeight(zoom);
    		const mapW = mapH * mapRatio;
    		const allowedMarginX = 0.1 * screenW;
    		const allowedMarginY = 0.05 * screenH;

    		return {
    			x: normalizeDimension(mapW, screenW, allowedMarginX, x * screenW) / screenW,
    			y: normalizeDimension(mapH, screenH, allowedMarginY, y * screenH) / screenH
    		};
    	};

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Pane> was created with unknown prop '${key}'`);
    	});

    	function onwindowresize() {
    		$$invalidate(0, screenH = window.innerHeight);
    		$$invalidate(1, screenW = window.innerWidth);
    	}

    	const load_handler = e => {
    		$$invalidate(4, mapRatio = e.target.width / e.target.height);
    	};

    	const mousedown_handler = e => {
    		$$invalidate(3, dragStart = {
    			x: e.screenX,
    			y: e.screenY,
    			ox: $offset.x,
    			oy: $offset.y
    		});
    	};

    	const mousemove_handler = e => {
    		if (dragStart) {
    			offset.set({
    				x: dragStart.ox - (dragStart.x - e.screenX) / screenW,
    				y: dragStart.oy - (dragStart.y - e.screenY) / screenH
    			});
    		}
    	};

    	const wheel_handler = e => {
    		const multiplier = Math.exp(e.wheelDeltaY / 500);
    		$$invalidate(2, zoom *= multiplier);

    		offset.set(
    			normalizePosition(
    				{
    					x: e.screenX / screenW * (1 - multiplier) + multiplier * $offset.x,
    					y: e.screenY / screenH * (1 - multiplier) + multiplier * $offset.y
    				},
    				zoom
    			),
    			{ hard: true }
    		);
    	};

    	const touchstart_handler = e => {
    		const t0 = e.touches[0];
    		const t1 = e.touches[1] ?? e.touches[0];

    		if (e.touches.length >= 2) {
    			const dx = t0.screenX - t1.screenX;
    			const dy = t0.screenY - t1.screenY;
    			$$invalidate(5, initialTouchDistance = Math.sqrt(dx * dx + dy * dy));
    		}

    		const tx = (t0.screenX + t1.screenX) / 2;
    		const ty = (t0.screenY + t1.screenY) / 2;

    		$$invalidate(3, dragStart = {
    			x: tx,
    			y: ty,
    			ox: $offset.x,
    			oy: $offset.y
    		});
    	};

    	const touchmove_handler = e => {
    		e.preventDefault();
    		const t0 = e.touches[0];
    		const t1 = e.touches[1] ?? e.touches[0];
    		const tx = (t0.screenX + t1.screenX) / 2;
    		const ty = (t0.screenY + t1.screenY) / 2;

    		if (e.touches.length >= 2 && initialTouchDistance) {
    			const dx = t0.screenX - t1.screenX;
    			const dy = t0.screenY - t1.screenY;
    			const currentTouchDistance = Math.sqrt(dx * dx + dy * dy);
    			const zoomRatio = currentTouchDistance / initialTouchDistance;
    			$$invalidate(2, zoom *= zoomRatio);
    			$$invalidate(5, initialTouchDistance = currentTouchDistance);

    			// Update offset to keep the zoom centered
    			const centerX = tx / screenW;

    			const centerY = ty / screenH;

    			offset.set(
    				normalizePosition(
    					{
    						x: centerX * (1 - zoomRatio) + zoomRatio * $offset.x,
    						y: centerY * (1 - zoomRatio) + zoomRatio * $offset.y
    					},
    					zoom
    				),
    				{ hard: true }
    			);
    		} else {
    			offset.set({
    				x: dragStart.ox - (dragStart.x - tx) / screenW,
    				y: dragStart.oy - (dragStart.y - ty) / screenH
    			});
    		}
    	};

    	$$self.$capture_state = () => ({
    		spring,
    		yrToLat,
    		latToYr,
    		xrToLong,
    		longToXr,
    		cityToCoords,
    		CityMark,
    		screenH,
    		screenW,
    		zoom,
    		dragStart,
    		offset,
    		mapRatio,
    		initialTouchDistance,
    		onDragStop,
    		mapHeight,
    		normalizeDimension,
    		normalizePosition,
    		$offset
    	});

    	$$self.$inject_state = $$props => {
    		if ('screenH' in $$props) $$invalidate(0, screenH = $$props.screenH);
    		if ('screenW' in $$props) $$invalidate(1, screenW = $$props.screenW);
    		if ('zoom' in $$props) $$invalidate(2, zoom = $$props.zoom);
    		if ('dragStart' in $$props) $$invalidate(3, dragStart = $$props.dragStart);
    		if ('offset' in $$props) $$invalidate(7, offset = $$props.offset);
    		if ('mapRatio' in $$props) $$invalidate(4, mapRatio = $$props.mapRatio);
    		if ('initialTouchDistance' in $$props) $$invalidate(5, initialTouchDistance = $$props.initialTouchDistance);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		screenH,
    		screenW,
    		zoom,
    		dragStart,
    		mapRatio,
    		initialTouchDistance,
    		$offset,
    		offset,
    		onDragStop,
    		mapHeight,
    		normalizePosition,
    		onwindowresize,
    		load_handler,
    		mousedown_handler,
    		mousemove_handler,
    		wheel_handler,
    		touchstart_handler,
    		touchmove_handler
    	];
    }

    class Pane extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Pane",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.59.2 */

    function create_fragment(ctx) {
    	let pane;
    	let current;
    	pane = new Pane({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(pane.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(pane, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(pane.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(pane.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(pane, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let focusX = 10;
    	let focusY = 0;
    	let h = 90;
    	let mapDiv;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ focusX, focusY, h, mapDiv, Pane });

    	$$self.$inject_state = $$props => {
    		if ('focusX' in $$props) focusX = $$props.focusX;
    		if ('focusY' in $$props) focusY = $$props.focusY;
    		if ('h' in $$props) h = $$props.h;
    		if ('mapDiv' in $$props) mapDiv = $$props.mapDiv;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
