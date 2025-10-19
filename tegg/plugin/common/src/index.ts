// ctx[TEGG_CONTEXT] is the tegg context, aka `teggCtx`
export const TEGG_CONTEXT: symbol = Symbol.for('context#teggContext');
// teggCtx.get(EGG_CONTEXT) is the egg context, aka `ctx`
export const EGG_CONTEXT: symbol = Symbol.for('context#eggContext');
// teggCtx.get(ROOT_PROTO) is the root proto, equivalent to ctx[ROOT_PROTO]
export const ROOT_PROTO: symbol = Symbol.for('context#rootProto');
