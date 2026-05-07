const mongoose = require('mongoose');

const panelSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    unique: true
  },
  messageId: String,
  channelId: String,
  ticketOptions: [{
    name: String,
    description: String,
    categoryId: String,
    emoji: String,
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  embed: {
    title: {
      type: String,
      default: 'Warrior Ticket Support'
    },
    description: {
      type: String,
      default: 'Select ticket type to open a support ticket'
    },
    color: {
      type: String,
      default: '#DC143C' // Crimson Red
    },
    footer: {
      type: String,
      default: 'PROGRAMMED BY SUBHAN'
    },
    icon: String,
    thumbnail: String,
    image: String
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

module.exports = mongoose.model('Panel', panelSchema);
