function normalizeComponent(obj) {
    if (obj == null) return obj;
    if (Array.isArray(obj)) return obj.map(normalizeComponent);
    if (typeof obj.toJSON === 'function') return obj.toJSON();
    return obj;
}

function normalizeOptions(options = {}) {
    const copy = { ...options };
    if (copy.components) copy.components = normalizeComponent(copy.components);
    return copy;
}

module.exports = {
    normalizeComponent,
    normalizeOptions
};
