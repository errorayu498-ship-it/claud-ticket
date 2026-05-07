const { EmbedBuilder } = require('discord.js');
const emojis = require('../emoji.json');

class Logger {
  constructor(client) {
    this.client = client;
  }

  async sendLog(guildId, type, data) {
    try {
      const guild = this.client.guilds.cache.get(guildId);
      if (!guild) return;

      const Settings = require('../models/Settings');
      const settings = await Settings.findOne({ guildId });
      
      if (!settings?.logsChannelId) {
        console.warn(`[LOGGER] No logs channel set for guild ${guildId}`);
        return;
      }

      const logsChannel = guild.channels.cache.get(settings.logsChannelId);
      if (!logsChannel) {
        console.warn(`[LOGGER] Logs channel not found for guild ${guildId}`);
        return;
      }

      let embed = this.createEmbed(type, data);
      await logsChannel.send({ embeds: [embed] }).catch(err => {
        console.error(`[LOGGER ERROR] Failed to send log: ${err.message}`);
      });

      console.log(`[LOG SENT] ${type} - ${guildId}`);
    } catch (error) {
      console.error(`[LOGGER CRITICAL ERROR] ${error.message}`);
    }
  }

  createEmbed(type, data) {
    const timestamp = new Date().toLocaleString('en-US', { 
      timeZone: 'Asia/Karachi',
      hour12: true 
    });

    const baseEmbed = new EmbedBuilder()
      .setFooter({ text: `PROGRAMMED BY SUBHAN • ${timestamp}` })
      .setColor('#DC143C');

    switch (type) {
      case 'TICKET_OPENED':
        return baseEmbed
          .setTitle(`${emojis.open} Ticket Opened`)
          .setDescription(
            `**User:** <@${data.userId}>\n` +
            `**Ticket ID:** \`${data.ticketId}\`\n` +
            `**Type:** ${data.ticketType}\n` +
            `**Channel:** <#${data.channelId}>\n` +
            `**Category:** <#${data.categoryId}>`
          )
          .setColor('#00FF00');

      case 'TICKET_CLOSED':
        return baseEmbed
          .setTitle(`${emojis.close} Ticket Closed`)
          .setDescription(
            `**User:** <@${data.userId}>\n` +
            `**Ticket ID:** \`${data.ticketId}\`\n` +
            `**Closed By:** <@${data.closedBy}>\n` +
            `**Duration:** ${data.duration}\n` +
            `**Messages:** ${data.messageCount}`
          )
          .setColor('#FF0000');

      case 'USER_LEFT':
        return baseEmbed
          .setTitle(`${emojis.user_leave} Auto-Closed: User Left`)
          .setDescription(
            `**User:** <@${data.userId}>\n` +
            `**Ticket ID:** \`${data.ticketId}\`\n` +
            `**Reason:** User left server\n` +
            `**Duration:** ${data.duration}`
          )
          .setColor('#FF6600');

      case 'PANEL_CREATED':
        return baseEmbed
          .setTitle(`${emojis.note} Panel Created`)
          .setDescription(
            `**Channel:** <#${data.channelId}>\n` +
            `**Message ID:** \`${data.messageId}\`\n` +
            `**Options:** ${data.optionCount}`
          )
          .setColor('#0099FF');

      case 'PANEL_UPDATED':
        return baseEmbed
          .setTitle(`${emojis.edit} Panel Updated`)
          .setDescription(
            `**Channel:** <#${data.channelId}>\n` +
            `**Updated By:** Web Portal\n` +
            `**Changes:** ${data.changes || 'Panel configuration updated'}`
          )
          .setColor('#00FF99');

      case 'ERROR':
        return baseEmbed
          .setTitle(`${emojis.error} Error Occurred`)
          .setDescription(
            `**Error Type:** ${data.errorType}\n` +
            `**Message:** ${data.message}\n` +
            `**Context:** ${data.context || 'N/A'}`
          )
          .setColor('#DC143C');

      case 'DM_SENT':
        return baseEmbed
          .setTitle(`${emojis.info} DM Notification Sent`)
          .setDescription(
            `**User:** <@${data.userId}>\n` +
            `**Ticket ID:** \`${data.ticketId}\`\n` +
            `**Message:** Ticket closed notification`
          )
          .setColor('#9900FF');

      default:
        return baseEmbed
          .setTitle(`${emojis.info} Log Entry`)
          .setDescription(JSON.stringify(data, null, 2));
    }
  }
}

module.exports = Logger;
