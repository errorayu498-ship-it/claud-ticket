const { Client, GatewayIntentBits, Collection, ChannelType, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const mongoose = require('mongoose');
require('dotenv').config();
const emojis = require('./emoji.json');
const Logger = require('./utils/logger');
const helpers = require('./utils/helpers');
const Ticket = require('./models/Ticket');
const Panel = require('./models/Panel');
const Settings = require('./models/Settings');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ]
});

let logger;

// ============ DATABASE CONNECTION ============
async function connectDatabase() {
  try {
    if (!helpers.isValidMongoURI(process.env.MONGODB_URI)) {
      throw new Error('Invalid MongoDB URI format');
    }

    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ MongoDB Connected Successfully');
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error.message);
    console.error('Please check your MONGODB_URI in .env file');
    process.exit(1);
  }
}

// ============ BOT READY EVENT ============
client.on('ready', async () => {
  try {
    logger = new Logger(client);
    
    console.log(`
╔════════════════════════════════════════╗
║   🎟️  WARRIOR TICKET BOT v2.0  🎟️      ║
║   PROGRAMMED BY SUBHAN              ║
╚════════════════════════════════════════╝
    `);

    console.log(`✅ Bot logged in as: ${client.user.tag}`);
    console.log(`📊 Servers: ${client.guilds.cache.size}`);
    console.log(`👥 Total Members: ${client.guilds.cache.reduce((a, b) => a + b.memberCount, 0)}`);

    // Set bot activity
    client.user.setActivity('⚔️ Warrior Ticket', { type: 'WATCHING' });
    client.user.setStatus('dnd');

    console.log('✨ Bot is ready to manage tickets!');
  } catch (error) {
    console.error('Error in ready event:', error);
  }
});

// ============ INTERACTION HANDLER ============
client.on('interactionCreate', async (interaction) => {
  try {
    // Select Menu - Ticket Type Selection
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_select') {
        await handleTicketSelection(interaction);
      }
      return;
    }

    // Buttons
    if (interaction.isButton()) {
      if (interaction.customId === 'close_ticket') {
        await handleCloseTicket(interaction);
      } else if (interaction.customId === 'reopen_ticket') {
        await handleReopenTicket(interaction);
      } else if (interaction.customId === 'claim_ticket') {
        await handleClaimTicket(interaction);
      }
      return;
    }

    // Slash Commands
    if (interaction.isCommand()) {
      await handleSlashCommand(interaction);
      return;
    }
  } catch (error) {
    console.error('Interaction error:', error);
    try {
      await interaction.reply({
        embeds: [helpers.createErrorEmbed('Error', error.message)],
        ephemeral: true
      });
    } catch (e) {
      console.error('Failed to send error response:', e);
    }
  }
});

// ============ HANDLE TICKET SELECTION ============
async function handleTicketSelection(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const selectedType = interaction.values[0];
    const Settings = require('./models/Settings');
    const settings = await Settings.findOne({ guildId: interaction.guildId });

    if (!settings) {
      return await interaction.editReply({
        embeds: [helpers.createErrorEmbed('Error', 'Bot not configured for this server')]
      });
    }

    // Check if user already has an open ticket
    const existingTicket = await Ticket.findOne({
      userId: interaction.user.id,
      guildId: interaction.guildId,
      status: 'open'
    });

    if (existingTicket) {
      return await interaction.editReply({
        embeds: [helpers.createErrorEmbed(
          'Ticket Already Open',
          `You already have an open ticket: <#${existingTicket.channelId}>`
        )]
      });
    }

    const categoryConfig = settings.ticketCategories.find(c => c.type === selectedType);
    if (!categoryConfig) {
      return await interaction.editReply({
        embeds: [helpers.createErrorEmbed('Error', 'Invalid ticket type')]
      });
    }

    // Create ticket
    const ticketId = helpers.generateTicketId();
    const categoryName = helpers.formatCategoryName(selectedType, Math.floor(Math.random() * 99) + 1);

    let category = interaction.guild.channels.cache.get(categoryConfig.categoryId);
    if (!category) {
      return await interaction.editReply({
        embeds: [helpers.createErrorEmbed('Error', 'Category not found')]
      });
    }

    // Create channel
    const ticketChannel = await interaction.guild.channels.create({
      name: `${selectedType}-${interaction.user.username.toLowerCase()}`,
      type: ChannelType.GuildText,
      parent: category,
      permissionOverwrites: [
        {
          id: interaction.guildId,
          deny: ['ViewChannel'],
        },
        {
          id: interaction.user.id,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
        },
      ],
    });

    // Save to database
    const newTicket = new Ticket({
      ticketId,
      guildId: interaction.guildId,
      userId: interaction.user.id,
      username: interaction.user.username,
      ticketType: selectedType,
      channelId: ticketChannel.id,
      categoryId: category.id,
      status: 'open',
      description: null
    });

    await newTicket.save();

    // Send welcome embed
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`${emojis.ticket} New Support Ticket`)
      .setDescription(
        `**Welcome <@${interaction.user.id}>!**\n\n` +
        `${emojis.info} Our support team will respond shortly.\n` +
        `${emojis.note} Ticket ID: \`${ticketId}\`\n` +
        `${emojis.clock} Created: <t:${Math.floor(Date.now() / 1000)}:F>`
      )
      .setColor('#DC143C')
      .setFooter({ text: `PROGRAMMED BY SUBHAN • Server: ${interaction.guild.name}` })
      .setThumbnail(interaction.user.displayAvatarURL());

    const closeButton = new ButtonBuilder()
      .setCustomId('close_ticket')
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji(emojis.close);

    const claimButton = new ButtonBuilder()
      .setCustomId('claim_ticket')
      .setLabel('Claim Ticket')
      .setStyle(ButtonStyle.Primary)
      .setEmoji(emojis.admin);

    const row = new ActionRowBuilder().addComponents(closeButton, claimButton);

    await ticketChannel.send({
      embeds: [welcomeEmbed],
      components: [row]
    });

    // Grant access to support roles
    if (settings.supportRoleIds?.length > 0) {
      for (const roleId of settings.supportRoleIds) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (role) {
          await ticketChannel.permissionOverwrites.create(role, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
          });
        }
      }
    }

    // Grant access to admin roles
    if (settings.adminRoleIds?.length > 0) {
      for (const roleId of settings.adminRoleIds) {
        const role = interaction.guild.roles.cache.get(roleId);
        if (role) {
          await ticketChannel.permissionOverwrites.create(role, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true,
            ManageMessages: true,
            ManageChannel: true,
          });
        }
      }
    }

    // Send log
    await logger.sendLog(interaction.guildId, 'TICKET_OPENED', {
      ticketId,
      userId: interaction.user.id,
      ticketType: selectedType,
      channelId: ticketChannel.id,
      categoryId: category.id
    });

    await interaction.editReply({
      embeds: [helpers.createSuccessEmbed(
        'Ticket Created',
        `Your support ticket has been created!\n<#${ticketChannel.id}>`
      )]
    });

  } catch (error) {
    console.error('Ticket selection error:', error);
    await interaction.editReply({
      embeds: [helpers.createErrorEmbed(
        'Error Creating Ticket',
        error.message
      )]
    });
  }
}

// ============ HANDLE CLOSE TICKET ============
async function handleCloseTicket(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const ticket = await Ticket.findOne({
      channelId: interaction.channel.id,
      status: 'open'
    });

    if (!ticket) {
      return await interaction.editReply({
        embeds: [helpers.createErrorEmbed('Error', 'Ticket not found')]
      });
    }

    const Settings = require('./models/Settings');
    const settings = await Settings.findOne({ guildId: interaction.guildId });

    // Check permissions
    const isAdmin = interaction.member.roles.cache.some(r => settings?.adminRoleIds?.includes(r.id));
    const isSupport = interaction.member.roles.cache.some(r => settings?.supportRoleIds?.includes(r.id));
    const isOwner = interaction.user.id === process.env.OWNER_ID;

    if (!isAdmin && !isSupport && !isOwner) {
      return await interaction.editReply({
        embeds: [helpers.createErrorEmbed(
          'Permission Denied',
          'Only admins and support staff can close tickets'
        )]
      });
    }

    // Update ticket
    const closeDuration = helpers.formatDuration(ticket.createdAt);
    ticket.status = 'closed';
    ticket.closedBy = interaction.user.id;
    ticket.closedAt = new Date();
    await ticket.save();

    // Send DM to ticket creator
    if (settings?.sendDMOnClose) {
      try {
        const user = await client.users.fetch(ticket.userId);
        const dmEmbed = new EmbedBuilder()
          .setTitle(`${emojis.close} Ticket Closed`)
          .setDescription(
            `Your ticket has been closed.\n\n` +
            `**Ticket ID:** \`${ticket.ticketId}\`\n` +
            `**Type:** ${ticket.ticketType}\n` +
            `**Duration:** ${closeDuration}\n` +
            `**Closed By:** <@${interaction.user.id}>`
          )
          .setColor('#DC143C')
          .setFooter({ text: 'PROGRAMMED BY SUBHAN' })
          .setTimestamp();

        await user.send({ embeds: [dmEmbed] });
        ticket.dmSent = true;
        await ticket.save();

        await logger.sendLog(interaction.guildId, 'DM_SENT', {
          userId: ticket.userId,
          ticketId: ticket.ticketId
        });
      } catch (dmError) {
        console.log(`Could not send DM to user ${ticket.userId}: DMs likely disabled`);
      }
    }

    // Send log
    await logger.sendLog(interaction.guildId, 'TICKET_CLOSED', {
      ticketId: ticket.ticketId,
      userId: ticket.userId,
      closedBy: interaction.user.id,
      duration: closeDuration,
      messageCount: ticket.messages
    });

    // Send close message
    const closeEmbed = new EmbedBuilder()
      .setTitle(`${emojis.close} Ticket Closed`)
      .setDescription(
        `This ticket has been closed by <@${interaction.user.id}>\n` +
        `Duration: ${closeDuration}`
      )
      .setColor('#FF0000')
      .setFooter({ text: 'PROGRAMMED BY SUBHAN' });

    await interaction.channel.send({ embeds: [closeEmbed] });

    // Archive channel (rename with 🔒 prefix)
    await interaction.channel.setName(`🔒-${interaction.channel.name}`);

    await interaction.editReply({
      embeds: [helpers.createSuccessEmbed('Ticket Closed', 'Channel will be archived')]
    });

    // Delete channel after 30 seconds
    setTimeout(async () => {
      try {
        await interaction.channel.delete();
      } catch (e) {
        console.error('Failed to delete channel:', e);
      }
    }, 30000);

  } catch (error) {
    console.error('Close ticket error:', error);
    await interaction.editReply({
      embeds: [helpers.createErrorEmbed('Error', error.message)]
    });
  }
}

// ============ HANDLE REOPEN TICKET ============
async function handleReopenTicket(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const ticket = await Ticket.findOne({
      userId: interaction.user.id,
      ticketType: interaction.customId.split('_')[2],
      status: 'closed'
    }).sort({ closedAt: -1 }).limit(1);

    if (!ticket) {
      return await interaction.editReply({
        embeds: [helpers.createErrorEmbed('Error', 'No closed tickets found')]
      });
    }

    ticket.status = 'open';
    ticket.closedBy = null;
    ticket.closedAt = null;
    await ticket.save();

    await interaction.editReply({
      embeds: [helpers.createSuccessEmbed(
        'Ticket Reopened',
        'Your support ticket has been reopened'
      )]
    });

  } catch (error) {
    console.error('Reopen ticket error:', error);
    await interaction.editReply({
      embeds: [helpers.createErrorEmbed('Error', error.message)]
    });
  }
}

// ============ HANDLE CLAIM TICKET ============
async function handleClaimTicket(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const ticket = await Ticket.findOne({
      channelId: interaction.channel.id
    });

    if (!ticket) {
      return await interaction.editReply({
        embeds: [helpers.createErrorEmbed('Error', 'Ticket not found')]
      });
    }

    const claimEmbed = new EmbedBuilder()
      .setTitle(`${emojis.admin} Ticket Claimed`)
      .setDescription(`<@${interaction.user.id}> has claimed this ticket`)
      .setColor('#FFA500')
      .setFooter({ text: 'PROGRAMMED BY SUBHAN' })
      .setTimestamp();

    await interaction.channel.send({ embeds: [claimEmbed] });

    await interaction.editReply({
      embeds: [helpers.createSuccessEmbed(
        'Ticket Claimed',
        'You have claimed this ticket'
      )]
    });

  } catch (error) {
    console.error('Claim ticket error:', error);
    await interaction.editReply({
      embeds: [helpers.createErrorEmbed('Error', error.message)]
    });
  }
}

// ============ HANDLE SLASH COMMANDS ============
async function handleSlashCommand(interaction) {
  const { commandName, guildId, user } = interaction;

  try {
    // Only allow owner
    if (user.id !== process.env.OWNER_ID) {
      return await interaction.reply({
        embeds: [helpers.createErrorEmbed(
          'Access Denied',
          'Only bot owner can use this command'
        )],
        ephemeral: true
      });
    }

    if (commandName === 'setup-tickets') {
      await handleSetupCommand(interaction);
    } else if (commandName === 'create-panel') {
      await handleCreatePanelCommand(interaction);
    } else if (commandName === 'panel-info') {
      await handlePanelInfoCommand(interaction);
    }
  } catch (error) {
    console.error('Command error:', error);
    await interaction.reply({
      embeds: [helpers.createErrorEmbed('Error', error.message)],
      ephemeral: true
    });
  }
}

// ============ SETUP COMMAND ============
async function handleSetupCommand(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const adminRole = interaction.options.getRole('admin_role');
    const supportRole = interaction.options.getRole('support_role');
    const logsChannel = interaction.options.getChannel('logs_channel');

    // Create/Update settings
    let settings = await Settings.findOne({ guildId: interaction.guildId });
    if (!settings) {
      settings = new Settings({ guildId: interaction.guildId });
    }

    settings.adminRoleIds = [adminRole.id];
    settings.supportRoleIds = [supportRole.id];
    settings.logsChannelId = logsChannel.id;
    settings.autoCloseOnLeave = true;
    settings.sendDMOnClose = true;

    await settings.save();

    const setupEmbed = new EmbedBuilder()
      .setTitle(`${emojis.success} Bot Setup Complete`)
      .setDescription(
        `**Configuration:**\n` +
        `${emojis.admin} Admin Role: <@&${adminRole.id}>\n` +
        `${emojis.shield} Support Role: <@&${supportRole.id}>\n` +
        `${emojis.logs} Logs Channel: <#${logsChannel.id}>`
      )
      .setColor('#00FF00')
      .setFooter({ text: 'PROGRAMMED BY SUBHAN' });

    await interaction.editReply({ embeds: [setupEmbed] });

    await logger.sendLog(interaction.guildId, 'PANEL_CREATED', {
      channelId: logsChannel.id,
      messageId: 'system',
      optionCount: 0
    });

  } catch (error) {
    throw new Error(`Setup failed: ${error.message}`);
  }
}

// ============ CREATE PANEL COMMAND ============
async function handleCreatePanelCommand(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const panelChannel = interaction.options.getChannel('channel');
    const ticketType = interaction.options.getString('type');
    const categoryInput = interaction.options.getChannel('category');

    if (categoryInput.type !== ChannelType.GuildCategory) {
      return await interaction.editReply({
        embeds: [helpers.createErrorEmbed('Error', 'Invalid channel type. Must be a category.')]
      });
    }

    // Get or create settings
    let settings = await Settings.findOne({ guildId: interaction.guildId });
    if (!settings) {
      return await interaction.editReply({
        embeds: [helpers.createErrorEmbed(
          'Error',
          'Bot not configured. Use `/setup-tickets` first'
        )]
      });
    }

    // Add category to settings
    const existingCategory = settings.ticketCategories.find(c => c.type === ticketType);
    if (!existingCategory) {
      settings.ticketCategories.push({
        categoryId: categoryInput.id,
        type: ticketType,
        name: categoryInput.name,
        createdAt: new Date()
      });
      await settings.save();
    }

    // Create or update panel
    let panel = await Panel.findOne({ guildId: interaction.guildId });
    if (!panel) {
      panel = new Panel({
        guildId: interaction.guildId,
        channelId: panelChannel.id,
        ticketOptions: []
      });
    }

    // Check if option exists
    const existingOption = panel.ticketOptions.find(opt => opt.name === ticketType);
    if (!existingOption) {
      panel.ticketOptions.push({
        name: ticketType,
        description: `Open a ${ticketType} ticket`,
        categoryId: categoryInput.id,
        emoji: emojis[ticketType] || '🎯',
        isActive: true
      });
    }

    panel.messageId = '';
    panel.updatedAt = new Date();
    await panel.save();

    // Delete old panel if exists
    if (panel.messageId) {
      try {
        const oldChannel = interaction.guild.channels.cache.get(panel.channelId);
        if (oldChannel) {
          const msg = await oldChannel.messages.fetch(panel.messageId).catch(() => null);
          if (msg) await msg.delete();
        }
      } catch (e) {
        console.log('Could not delete old panel');
      }
    }

    // Create new panel embed
    const panelEmbed = createTicketPanelEmbed(panel);
    const selectMenu = createTicketSelectMenu(panel.ticketOptions);

    const row = new ActionRowBuilder().addComponents(selectMenu);
    const sentMessage = await panelChannel.send({
      embeds: [panelEmbed],
      components: [row]
    });

    panel.messageId = sentMessage.id;
    panel.channelId = panelChannel.id;
    await panel.save();

    const successEmbed = new EmbedBuilder()
      .setTitle(`${emojis.success} Panel Created`)
      .setDescription(
        `**Channel:** <#${panelChannel.id}>\n` +
        `**Message ID:** \`${sentMessage.id}\`\n` +
        `**Options:** ${panel.ticketOptions.length}`
      )
      .setColor('#00FF00')
      .setFooter({ text: 'PROGRAMMED BY SUBHAN' });

    await interaction.editReply({ embeds: [successEmbed] });

    await logger.sendLog(interaction.guildId, 'PANEL_CREATED', {
      channelId: panelChannel.id,
      messageId: sentMessage.id,
      optionCount: panel.ticketOptions.length
    });

  } catch (error) {
    throw new Error(`Panel creation failed: ${error.message}`);
  }
}

// ============ PANEL INFO COMMAND ============
async function handlePanelInfoCommand(interaction) {
  try {
    await interaction.deferReply({ ephemeral: true });

    const panel = await Panel.findOne({ guildId: interaction.guildId });
    if (!panel) {
      return await interaction.editReply({
        embeds: [helpers.createErrorEmbed('Error', 'No panel found for this server')]
      });
    }

    const infoEmbed = new EmbedBuilder()
      .setTitle(`${emojis.info} Panel Information`)
      .setDescription(
        `**Channel:** <#${panel.channelId}>\n` +
        `**Message ID:** \`${panel.messageId}\`\n` +
        `**Created:** <t:${Math.floor(panel.createdAt.getTime() / 1000)}:F>\n` +
        `**Last Updated:** <t:${Math.floor(panel.updatedAt.getTime() / 1000)}:F>`
      )
      .addFields(
        { name: 'Ticket Options', value: panel.ticketOptions.map(o => `${o.emoji} ${o.name}`).join('\n') || 'None' }
      )
      .setColor('#0099FF')
      .setFooter({ text: 'PROGRAMMED BY SUBHAN' });

    await interaction.editReply({ embeds: [infoEmbed] });

  } catch (error) {
    throw new Error(`Panel info failed: ${error.message}`);
  }
}

// ============ HELPER FUNCTIONS ============
function createTicketPanelEmbed(panel) {
  return new EmbedBuilder()
    .setTitle(panel.embed.title)
    .setDescription(panel.embed.description)
    .setColor(panel.embed.color || '#DC143C')
    .setFooter({ text: panel.embed.footer || 'PROGRAMMED BY SUBHAN' })
    .setThumbnail(panel.embed.thumbnail)
    .setImage(panel.embed.image);
}

function createTicketSelectMenu(options) {
  const selectOptions = options.map(opt => ({
    label: opt.name.charAt(0).toUpperCase() + opt.name.slice(1),
    value: opt.name,
    emoji: opt.emoji,
    description: opt.description
  }));

  return new StringSelectMenuBuilder()
    .setCustomId('ticket_select')
    .setPlaceholder('📋 Select ticket type')
    .addOptions(selectOptions);
}

// ============ MEMBER LEAVE HANDLER ============
client.on('guildMemberRemove', async (member) => {
  try {
    if (!process.env.MONGODB_URI) return;

    const settings = await Settings.findOne({ guildId: member.guild.id });
    if (!settings?.autoCloseOnLeave) return;

    const openTickets = await Ticket.find({
      userId: member.user.id,
      guildId: member.guild.id,
      status: 'open'
    });

    for (const ticket of openTickets) {
      try {
        const ticketChannel = member.guild.channels.cache.get(ticket.channelId);
        if (!ticketChannel) {
          ticket.status = 'closed';
          ticket.closedAt = new Date();
          await ticket.save();
          continue;
        }

        const duration = helpers.formatDuration(ticket.createdAt);
        ticket.status = 'closed';
        ticket.closedAt = new Date();
        ticket.closedBy = 'SYSTEM_AUTO_CLOSE';
        await ticket.save();

        const autoCloseEmbed = new EmbedBuilder()
          .setTitle(`${emojis.user_leave} Auto-Closed`)
          .setDescription(
            `Ticket automatically closed because the user left the server.\n\n` +
            `**User:** ${member.user.tag}\n` +
            `**Ticket ID:** \`${ticket.ticketId}\`\n` +
            `**Duration:** ${duration}`
          )
          .setColor('#FF6600')
          .setFooter({ text: 'PROGRAMMED BY SUBHAN' });

        await ticketChannel.send({ embeds: [autoCloseEmbed] });

        await logger.sendLog(member.guild.id, 'USER_LEFT', {
          userId: member.user.id,
          ticketId: ticket.ticketId,
          duration
        });

        // Delete after delay
        setTimeout(() => ticketChannel.delete().catch(() => {}), 5000);

      } catch (error) {
        console.error(`Error closing ticket ${ticket.ticketId}:`, error);
      }
    }
  } catch (error) {
    console.error('Member leave handler error:', error);
  }
});

// ============ ERROR HANDLERS ============
process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  try {
    const guild = client.guilds.cache.first();
    if (guild && logger) {
      await logger.sendLog(guild.id, 'ERROR', {
        errorType: 'Unhandled Rejection',
        message: String(reason),
        context: 'Process level'
      });
    }
  } catch (e) {
    console.error('Failed to log error:', e);
  }
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// ============ LOGIN ============
async function start() {
  try {
    await connectDatabase();
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('Startup error:', error);
    process.exit(1);
  }
}

start();

module.exports = client;
