const logger = require('../../../log/logger');
const configuration = require("../../../config/config");

// patch: exponential backoff (reconnectTimeout -> max 5 min) instead of a fixed 10 s interval,
// which hammered unreachable speakers until newer firmware started refusing the NAS
const MAX_DELAY = 5 * 60 * 1000;

class ReconnectionManager {
    constructor(device) {
        this._device = device;
        this._timer = null;
        this._delay = 0;

        this.setListener();
    }

    setListener() {
        this._device.on('linkChanged', () => {
            this.evaluate();
        });
    }

    evaluate() {
        const link = this._device.link;
        if (link === 'connected') {
            this._delay = 0;
            this.clear();
        } else if (link === 'disconnected') {
            this.schedule();
        }
    }

    schedule() {
        if (this._timer != null) return;
        const base = configuration.reconnectTimeout > 0 ? configuration.reconnectTimeout : 10000;
        this._delay = this._delay ? Math.min(this._delay * 2, MAX_DELAY) : base;
        logger.log('info', 'ReconnectionManager.schedule()', 'next attempt in ' + this._delay + ' ms', this._device.id);
        this._timer = setTimeout(() => {
            this._timer = null;
            this.reconnect();
        }, this._delay);
    }

    reconnect() {
        if (this._device.link === 'connected') return;
        if (this._device.link !== 'connecting') {
            this._device.connect();
        }
        // device link events only fire on change, so always queue the next attempt;
        // it is cancelled as soon as the link becomes 'connected'
        this.schedule();
    }

    clear() {
        if (this._timer != null) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }

    stop() {
        this.clear();
        this._delay = 0;
    }
}

module.exports = ReconnectionManager;
