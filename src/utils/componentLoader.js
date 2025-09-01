const fs = require('node:fs');
const path = require('node:path');

/**
 * Load component handler modules from a directory recursively.
 * Returns a Map where keys are string customIds and values are handler objects.
 */
function loadComponentsFromDir(dir) {
    const components = new Map();

    function loadDir(dirPath) {
        const files = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                loadDir(fullPath);
                continue;
            }

            if (!file.name.endsWith('.js')) continue;

            try {
                const componentExports = require(fullPath);

                let handlers = [];
                if (Array.isArray(componentExports)) {
                    handlers = componentExports;
                } else if (componentExports && typeof componentExports === 'object') {
                    if (typeof componentExports.customId !== 'undefined' && typeof componentExports.execute === 'function') {
                        handlers.push(componentExports);
                    }

                    for (const val of Object.values(componentExports)) {
                        if (val && typeof val === 'object' && typeof val.customId !== 'undefined' && typeof val.execute === 'function') {
                            if (!handlers.includes(val)) handlers.push(val);
                        }
                    }
                }

                for (const handler of handlers) {
                    if (handler && typeof handler.customId !== 'undefined' && typeof handler.execute === 'function') {
                        const key = handler.customId instanceof RegExp ? handler.customId.toString() : handler.customId;
                        if (components.has(key)) {
                            console.warn(`[WARNING] Duplicate component customId found: ${key}. Overwriting.`);
                        }
                        components.set(key, handler);
                    }
                }
            } catch (err) {
                console.error(`[ERROR] Failed to load components from ${fullPath}:`, err);
            }
        }
    }

    loadDir(dir);
    return components;
}

module.exports = { loadComponentsFromDir };
