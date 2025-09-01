const fs = require('node:fs');
const path = require('node:path');

const STORE_PATH = path.join(__dirname, '..', '..', 'data', 'errorLogs.json');

function _readStore() {
    try {
        if (!fs.existsSync(STORE_PATH)) return {};
        const raw = fs.readFileSync(STORE_PATH, 'utf8');
        return JSON.parse(raw || '{}');
    } catch (err) {
        console.error('Failed to read error log store:', err);
        return {};
    }
}

function _writeStore(obj) {
    try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(obj, null, 2), 'utf8');
    } catch (err) {
        console.error('Failed to write error log store:', err);
    }
}

function setErrorLogChannel(guildId, channelId) {
    const store = _readStore();
    store[guildId] = channelId;
    _writeStore(store);
}

function getErrorLogChannel(guildId) {
    const store = _readStore();
    return store[guildId];
}

function getAllMappings() {
    return _readStore();
}

module.exports = { setErrorLogChannel, getErrorLogChannel, getAllMappings };
