const { EmbedBuilder } = require('discord.js');
const crypto = require('crypto');
const emojis = require('../emoji.json');

const helpers = {
  // Generate unique ticket ID
  generateTicketId() {
    return `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  },

  // Format time difference
  formatDuration(startDate, endDate = new Date()) {
    const ms = endDate - startDate;
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / 1000 / 60) % 60);
    const hours = Math.floor((ms / 1000 / 60 / 60) % 24);
    const days = Math.floor(ms / 1000 / 60 / 60 / 24);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  },

  // Create error embed
  createErrorEmbed(title, description) {
    return new EmbedBuilder()
      .setTitle(`${emojis.error} ${title}`)
      .setDescription(description)
      .setColor('#DC143C')
      .setFooter({ text: 'PROGRAMMED BY SUBHAN' })
      .setTimestamp();
  },

  // Create success embed
  createSuccessEmbed(title, description) {
    return new EmbedBuilder()
      .setTitle(`${emojis.success} ${title}`)
      .setDescription(description)
      .setColor('#00FF00')
      .setFooter({ text: 'PROGRAMMED BY SUBHAN' })
      .setTimestamp();
  },

  // Create info embed
  createInfoEmbed(title, description) {
    return new EmbedBuilder()
      .setTitle(`${emojis.info} ${title}`)
      .setDescription(description)
      .setColor('#0099FF')
      .setFooter({ text: 'PROGRAMMED BY SUBHAN' })
      .setTimestamp();
  },

  // Hash password for portal
  hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
  },

  // Generate random token
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  },

  // Check if user has permission
  async hasTicketPermission(member, ticketType, settings) {
    if (!member) return false;

    // Admin can do everything
    if (member.roles.cache.some(r => settings.adminRoleIds?.includes(r.id))) {
      return true;
    }

    // Support can manage their assigned categories
    if (member.roles.cache.some(r => settings.supportRoleIds?.includes(r.id))) {
      return true;
    }

    return false;
  },

  // Format category name
  formatCategoryName(type, number) {
    const prefixes = {
      'support': 'Support',
      'buy': 'Purchase',
      'bug': 'Bug Report',
      'feedback': 'Feedback',
      'other': 'Other'
    };

    const prefix = prefixes[type] || type;
    const categoryNum = String(number).padStart(2, '0');
    return `${prefix}-${categoryNum}`;
  },

  // Validate MongoDB URI
  isValidMongoURI(uri) {
    const mongoRegex = /^mongodb(\+srv)?:\/\/(.+)/i;
    return mongoRegex.test(uri);
  },

  // Parse admin mention/ID
  parseUserId(input) {
    const idMatch = input.match(/\d{17,19}/);
    return idMatch ? idMatch[0] : null;
  }
};

module.exports = helpers;
