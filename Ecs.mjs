/** @typedef {{ [key: string]: unknown }} Props */
/** @typedef {{ props: Props}} Component */
/** @typedef {{ reqs: string[], comps: Component[], action: ((reqs: any[], props: Props[]) => void) }} System */
/** @typedef {{ values: [Component, Props]}} Entity */
/** @typedef {{ comps: Component[], systems: System[], entities: Entity[] }} Engine */

/** @type {Engine} */
const ECS = {
    comps: [],
    systems: [],
    entities: []
}

/**
 * Creates a Component.
 * @param {Props} props 
 * @returns {Component}
 */
export function component(props) {
    const c = { props };
    ECS.comps.push(c);
    return c;
}

/**
 * Creates a System.
 * @param {string[]} reqs
 * @param {Component[]} comps 
 * @param {(props: Props[]) => void} action 
 * @returns {System}
 */
export function system(reqs, comps, action) {
    const s = { reqs, comps, action };
    ECS.systems.push(s);
    return s;
}

/**
 * Creates a new Entity.
 * @param {([Component, Props] | Component)[]} defaults
 * @returns {Entity}
 */
export function entity(defaults) {
    /** @type {Entity} */
    const e = { values: defaults.map((x) => Array.isArray(x) ? [x[0], { ...x[0].props, ...x[1] }] : [x, { ...x.props }]) };
    ECS.entities.push(e);
    return e;
}

/**
 * Updates the ECS system.
 */
export function ecsUpdate(args) {
    ECS.systems.forEach(system => {
        const reqValues = system.reqs.map(r => args[r]);
        const entities = ECS.entities.filter(e => system.comps.every(c => e.values.map(([ec, _]) => ec).includes(c)));
        // console.log(ECS.entities[0], system.comps)
        entities.forEach(e => {
            const compValues = system.comps.map(c => e.values.find(([ec, _]) => ec === c)[1]);
            system.action(reqValues, compValues);
        })
    })
}