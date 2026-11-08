const Callback = require("./callback");
const Config = require("../config/config");
const logger = require("./../log/logger");
const jsonfile = require('jsonfile');
const MAX_FAILURES = 200; // ~ a few hours of status updates without any answer

class CallbackManager {
    static init() {
        if (!CallbackManager._callbacks) {
            CallbackManager._callbacks = new Map();
            CallbackManager.parseCallbacksJson();
        }
    }

    static get callbacks() {
        let callbacks = [];
        CallbackManager._callbacks.forEach(callback => {
            callbacks.push(callback.toObject());
        });
        return callbacks;
    }

    static getCallback(url) {
        return CallbackManager._callbacks.get(url);
    }

    static setCallback(url, settings) {
        if (!url || String(url).startsWith('undefined')) {
            logger.log('error', 'CallbackManager.setCallback()', 'ignoring invalid callback url: ' + String(url).slice(0, 40), '');
            return;
        }
        // patch: a SmartThings Edge driver gets a new port at every restart; replace older
        // callbacks pointing to the same host instead of accumulating dead ones
        const host = String(url).split(':')[0];
        Array.from(CallbackManager._callbacks.keys()).forEach(existing => {
            if (existing !== url && existing.split(':')[0] === host) {
                logger.log('error', 'CallbackManager.setCallback()', 'replacing old callback ' + existing + ' with ' + url, '');
                CallbackManager._callbacks.get(existing).delete();
                CallbackManager._callbacks.delete(existing);
            }
        });
        const callback = new Callback(url, settings);
        callback.onFailure = cb => {
            if (cb.failures >= MAX_FAILURES && CallbackManager._callbacks.get(url) === cb) {
                logger.log('error', 'CallbackManager', 'dropping dead callback ' + url + ' after ' + cb.failures + ' failures', '');
                CallbackManager.deleteCallback(url);
            }
        };
        CallbackManager._callbacks.set(url, callback);
        CallbackManager.writeCallbacks(CallbackManager.callbacks);
    }

    static deleteCallback(url) {
        if (!CallbackManager._callbacks.has(url)) return;
        CallbackManager._callbacks.get(url).delete();
        CallbackManager._callbacks.delete(url);
        CallbackManager.writeCallbacks(CallbackManager.callbacks);
    }

    static send(status) {
        logger.info('CallbackManager.send()', 'status: '+JSON.stringify(status), '');
        CallbackManager._callbacks.forEach(callback => {
            callback.send(status);
        });
    }

    //save to /config/callbacks.json
    static parseCallbacksJson() {
        let callbacks = CallbackManager.readFS();
        if (callbacks && callbacks.length > 0) {
            callbacks.forEach(callback => {
                console.log("parseCallbacksJson");
                CallbackManager.setCallback(callback.url, callback.settings);
            });
        }
    }

    static readFS() {
        let file = Config.getAbsolutePath()+'/config/callbacks.json';
        try { return jsonfile.readFileSync(file); }
        catch (e) { return false; }
    }

    static writeFS(object) {
        let file = Config.getAbsolutePath()+'/config/callbacks.json';
        jsonfile.writeFileSync(file, object, err => {
            //TODO: log err
        });
    }

    static writeCallbacks(callbacks) {
        CallbackManager.writeFS(callbacks);
    }
}

module.exports = CallbackManager;