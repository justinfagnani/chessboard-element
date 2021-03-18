/**
 * Copyright (c) 2019, Chris Oakman
 * Copyright (c) 2019, Justin Fagnani
 * Released under the MIT license
 * https://github.com/justinfagnani/chessboard-element/blob/master/LICENSE.md
 */
const RUN_ASSERTS = true;
export const isString = (s) => {
    return typeof s === 'string';
};
export const isFunction = (f) => {
    return typeof f === 'function';
};
export const isInteger = (n) => {
    return typeof n === 'number' && isFinite(n) && Math.floor(n) === n;
};
export const deepCopy = (thing) => {
    return JSON.parse(JSON.stringify(thing));
};
export const interpolateTemplate = (str, obj) => {
    for (const [key, value] of Object.entries(obj)) {
        const keyTemplateStr = '{' + key + '}';
        while (str.includes(keyTemplateStr)) {
            str = str.replace(keyTemplateStr, value);
        }
    }
    return str;
};
if (RUN_ASSERTS) {
    console.assert(interpolateTemplate('abc', { a: 'x' }) === 'abc');
    console.assert(interpolateTemplate('{a}bc', {}) === '{a}bc');
    console.assert(interpolateTemplate('{a}bc', { p: 'q' }) === '{a}bc');
    console.assert(interpolateTemplate('{a}bc', { a: 'x' }) === 'xbc');
    console.assert(interpolateTemplate('{a}bc{a}bc', { a: 'x' }) === 'xbcxbc');
    console.assert(interpolateTemplate('{a}{a}{b}', { a: 'x', b: 'y' }) === 'xxy');
}
//# sourceMappingURL=utils.js.map