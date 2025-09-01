const { getErrorLogChannel } = require('./errorLogStore');

/**
 * Send an error report to the configured error log channel for a guild.
 * payload: { client, guildId, error, context, metadata }
 * - error: Error instance or string
 * - context: string (e.g. '/command name' or 'component: customId')
 * - metadata: object with any additional fields (userTag, userId, channelId etc.)
 */
async function reportError({ client, guildId, error, context = 'Unknown', metadata = {} }) {
  try {
    const channelId = getErrorLogChannel(guildId);
    if (!channelId) return false;

    const guild = client.guilds.cache.get(guildId);
    if (!guild) return false;

    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (!channel) return false;

    const errObj = (error instanceof Error) ? error : new Error(String(error));

    const header = `**Error Report**\n**Context:** ${context}\n**Type:** ${errObj.name}\n**Message:** ${errObj.message}`;

    const metaLines = Object.entries(metadata || {}).map(([k, v]) => `**${k}:** ${v}`).join('\n');

    // Build copy-paste friendly stack block
    const stack = errObj.stack || 'No stack available';

    const fullMessage = [header, metaLines && `\n**Metadata:**\n${metaLines}`, '\n**Stack:**', '```\n' + stack + '\n```'].filter(Boolean).join('\n');

    // Discord message max size ~2000; if too long, send header+meta and attach stack as file
    if (fullMessage.length <= 1900) {
      await channel.send({ content: fullMessage });
    } else {
      await channel.send({ content: header + (metaLines ? `\n\n**Metadata:**\n${metaLines}` : '') });
      await channel.send({ files: [{ attachment: Buffer.from(stack, 'utf8'), name: 'stacktrace.txt' }] });
    }

    return true;
  } catch (err) {
    console.error('Failed to report error to configured channel:', err);
    return false;
  }
}

module.exports = { reportError };
