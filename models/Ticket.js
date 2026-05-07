const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    unique: true,
    required: true
  },
  guildId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  username: String,
  ticketType: {
    type: String,
    required: true // 'support', 'buy', etc.
  },
  channelId: {
    type: String,
    required: true
  },
  categoryId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'closed'],
    default: 'open'
  },
  closedBy: String,
  closedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  messages: {
    type: Number,
    default: 0
  },
  description: String,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  hasReplied: {
    type: Boolean,
    default: false
  },
  lastMessage: Date,
  dmSent: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
