require('dotenv').config();
const emojis = require('./emoji.json');

const config = {
  // Bot Configuration
  bot: {
    token: process.env.DISCORD_TOKEN,
    status: 'dnd',
    activity: {
      type: 'PLAYING,
      name: 'Warrior Ticket'
    }
  },

  // Database Configuration
  database: {
    uri: process.env.MONGODB_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    }
  },

  // Portal Configuration
  portal: {
    port: process.env.PORTAL_PORT || 8080,
    password: process.env.PORTAL_PASSWORD || 'root89',
    secret: process.env.PORTAL_SECRET || 'default_secret_key_min_32_characters_long',
    url: process.env.PORTAL_URL || 'http://localhost:8080'
  },

  // Discord IDs
  discord: {
    ownerId: process.env.OWNER_ID,
    logsChannelId: process.env.LOGS_CHANNEL_ID,
    adminRoleIds: (process.env.ADMIN_ROLE_ID || '').split(',').filter(Boolean),
    supportRoleIds: (process.env.SUPPORT_ROLE_IDS || '').split(',').filter(Boolean),
    serverId: process.env.SERVER_ID
  },

  // Emojis
  emojis: emojis,

  // Ticket Configuration
  tickets: {
    autoCloseOnLeave: true,
    sendDMOnClose: true,
    channelNameFormat: '{type}-{username}', // Use placeholders
    defaultDMMessage: 'Your ticket has been closed. Thank you for contacting us!',
    closeTimeoutSeconds: 30 // Time before deleting closed channel
  },

  // Panel Configuration
  panel: {
    defaultEmbedColor: '#DC143C',
    defaultEmbedFooter: 'PROGRAMMED BY SUBHAN',
    defaultEmbedTitle: 'Warrior Ticket System',
    defaultEmbedDescription: 'Select ticket type to open a ticket'
  },

  // Logging Configuration
  logging: {
    logTicketOpened: true,
    logTicketClosed: true,
    logUserLeft: true,
    logPanelCreated: true,
    logErrors: true
  },

  // Environment
  env: process.env.NODE_ENV || 'production',

  // Validation
  isValid: function() {
    const errors = [];

    if (!this.bot.token) errors.push('❌ DISCORD_TOKEN is required');
    if (!this.database.uri) errors.push('❌ MONGODB_URI is required');
    if (!this.discord.ownerId) errors.push('⚠️  OWNER_ID is recommended');
    if (!this.discord.logsChannelId) errors.push('⚠️  LOGS_CHANNEL_ID is recommended');

    return {
      valid: errors.length === 0,
      errors
    };
  },

  // Display config
  display: function() {
    return `
╔════════════════════════════════════════╗
║   🎟️  WARRIOR TICKET BOT v2.0  🎟️      ║
║   PROGRAMMED BY SUBHAN              ║
╚════════════════════════════════════════╝

⚙️  Configuration:
  • Environment: ${this.env}
  • Bot Token: ${this.bot.token ? '✅ Set' : '❌ Missing'}
  • MongoDB: ${this.database.uri ? '✅ Connected' : '❌ Missing'}
  • Owner ID: ${this.discord.ownerId || '⚠️  Not set'}
  • Portal Port: ${this.portal.port}
  • Admin Roles: ${this.discord.adminRoleIds.length}
  • Support Roles: ${this.discord.supportRoleIds.length}
    `;
  }
};

module.exports = config;
