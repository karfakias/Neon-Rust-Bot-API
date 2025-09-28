const axios = require('axios');
const Config = require('../../config/index.js');
const Fs = require('fs');
const Path = require('path');

function resolveWebhook(instance, serverId, alarm) {
    // priority: alarm.webhookUrl, alarm.webhook, instance.alarmWebhookUrl, config.forwarding.alarmForwardUrl, env
    if (alarm && alarm.webhookUrl) return alarm.webhookUrl;
    if (alarm && alarm.webhook) return alarm.webhook;
    if (instance && instance.alarmWebhookUrl) return instance.alarmWebhookUrl;
    // folder-level default webhook (instances/_default_alarm_webhook.txt)
    try {
        const instancesPath = Path.join(process.cwd(), 'instances', '_default_alarm_webhook.txt');
        if (Fs.existsSync(instancesPath)) {
            const val = Fs.readFileSync(instancesPath, 'utf8').trim();
            if (val.length > 0) return val;
        }
    } catch (e) { /* ignore */ }
    if (Config && Config.forwarding && Config.forwarding.alarmForwardUrl) return Config.forwarding.alarmForwardUrl;
    if (process.env.ALARM_FORWARD_URL) return process.env.ALARM_FORWARD_URL;
    return null;
}

async function sendForward(instance, serverId, alarmId, alarm) {
    try {
        const webhook = resolveWebhook(instance, serverId, alarm);
        if (!webhook) return false;

        const payload = {
            instanceId: instance && instance.activeServer ? instance.activeServer : null,
            serverId: serverId,
            alarmId: alarmId,
            alarm: alarm,
            phoneNumber: instance && instance.phoneNumber ? instance.phoneNumber : null,
            timestamp: Math.floor(Date.now() / 1000)
        };

        await axios.post(webhook, payload, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
        });
        return true;
    } catch (err) {
        // Do not throw - just log to console so main app isn't interrupted
        try { console.error('[alarmForwarder] Failed to forward alarm:', err.message || err); } catch (e) {}
        return false;
    }
}

module.exports = { sendForward };
