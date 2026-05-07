const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  logsChannelId: String,
  adminRoleIds: [String],
  supportRoleIds: [String],
  ticketCategories: [{
    categoryId: String,
    type: String,
    name: String,
    requiredRoles: [String], // For specific role access
    createdAt: Date
  }],
  autoCloseOnLeave: {
    type: Boolean,
    default: true
  },
  sendDMOnClose: {
    type: Boolean,
    default: true
  },
  dmMessage: {
    type: String,
    default: 'Your ticket has been closed. Thank you for contacting us!'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
