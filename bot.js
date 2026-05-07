const {
  Client,
  GatewayIntentBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  REST,
  Routes,
  SlashCommandBuilder
} = require('discord.js');

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

// ================= DATABASE =================
async function connectDatabase() {
  try {
    if (!helpers.isValidMongoURI(process.env.MONGODB_URI)) {
      throw new Error('Invalid MongoDB URI format');
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log('✅ MongoDB Connected');
  } catch (error) {
    console.error('❌ MongoDB Error:', error.message);
    process.exit(1);
  }
}

// ================= REGISTER COMMANDS =================
async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName('setup-tickets')
      .setDescription('Setup the ticket system')
      .addRoleOption(option =>
        option
          .setName('admin_role')
          .setDescription('Admin role')
          .setRequired(true)
      )
      .addRoleOption(option =>
        option
          .setName('support_role')
          .setDescription('Support role')
          .setRequired(true)
      )
      .addChannelOption(option =>
        option
          .setName('logs_channel')
          .setDescription('Logs channel')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('create-panel')
      .setDescription('Create ticket panel')
      .addChannelOption(option =>
        option
          .setName('channel')
          .setDescription('Panel channel')
          .setRequired(true)
      )
      .addStringOption(option =>
        option
          .setName('type')
          .setDescription('Ticket type')
          .setRequired(true)
          .addChoices(
            { name: 'Support', value: 'support' },
            { name: 'Buy', value: 'buy' },
            { name: 'Report', value: 'report' }
          )
      )
      .addChannelOption(option =>
        option
          .setName('category')
          .setDescription('Category channel')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('panel-info')
      .setDescription('Show panel info')
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );

    console.log('✅ Slash Commands Registered');
  } catch (error) {
    console.error('❌ Slash Command Error:', error);
  }
}

// ================= READY EVENT =================
client.on('ready', async () => {
  try {
    logger = new Logger(client);

    console.log(`✅ Logged in as ${client.user.tag}`);

    client.user.setActivity('⚔️ Warrior Ticket', {
      type: 3
    });

    client.user.setStatus('dnd');

    await registerCommands();

    console.log('🚀 Bot Ready');
  } catch (error) {
    console.error(error);
  }
});

// ================= INTERACTION =================
client.on('interactionCreate', async interaction => {
  try {

    // SELECT MENU
    if (interaction.isStringSelectMenu()) {
      if (interaction.customId === 'ticket_select') {
        return handleTicketSelection(interaction);
      }
    }

    // BUTTONS
    if (interaction.isButton()) {

      if (interaction.customId === 'close_ticket') {
        return handleCloseTicket(interaction);
      }

      if (interaction.customId === 'claim_ticket') {
        return handleClaimTicket(interaction);
      }
    }

    // SLASH COMMANDS
    if (interaction.isChatInputCommand()) {
      return handleSlashCommand(interaction);
    }

  } catch (error) {
    console.error(error);

    if (!interaction.replied) {
      await interaction.reply({
        content: '❌ Error occurred',
        ephemeral: true
      });
    }
  }
});

// ================= SLASH COMMAND HANDLER =================
async function handleSlashCommand(interaction) {

  if (interaction.user.id !== process.env.OWNER_ID) {
    return interaction.reply({
      content: '❌ Only bot owner can use commands',
      ephemeral: true
    });
  }

  if (interaction.commandName === 'setup-tickets') {
    return handleSetupCommand(interaction);
  }

  if (interaction.commandName === 'create-panel') {
    return handleCreatePanelCommand(interaction);
  }

  if (interaction.commandName === 'panel-info') {
    return handlePanelInfoCommand(interaction);
  }
}

// ================= SETUP COMMAND =================
async function handleSetupCommand(interaction) {

  await interaction.deferReply({ ephemeral: true });

  const adminRole = interaction.options.getRole('admin_role');
  const supportRole = interaction.options.getRole('support_role');
  const logsChannel = interaction.options.getChannel('logs_channel');

  let settings = await Settings.findOne({
    guildId: interaction.guildId
  });

  if (!settings) {
    settings = new Settings({
      guildId: interaction.guildId
    });
  }

  settings.adminRoleIds = [adminRole.id];
  settings.supportRoleIds = [supportRole.id];
  settings.logsChannelId = logsChannel.id;

  await settings.save();

  const embed = new EmbedBuilder()
    .setTitle('✅ Setup Complete')
    .setDescription(
      `Admin Role: <@&${adminRole.id}>\n` +
      `Support Role: <@&${supportRole.id}>\n` +
      `Logs Channel: <#${logsChannel.id}>`
    )
    .setColor('Green');

  await interaction.editReply({
    embeds: [embed]
  });
}

// ================= CREATE PANEL =================
async function handleCreatePanelCommand(interaction) {

  await interaction.deferReply({ ephemeral: true });

  const panelChannel = interaction.options.getChannel('channel');
  const ticketType = interaction.options.getString('type');
  const category = interaction.options.getChannel('category');

  let settings = await Settings.findOne({
    guildId: interaction.guildId
  });

  if (!settings) {
    return interaction.editReply({
      content: '❌ Setup bot first using /setup-tickets'
    });
  }

  const exists = settings.ticketCategories.find(
    x => x.type === ticketType
  );

  if (!exists) {
    settings.ticketCategories.push({
      type: ticketType,
      categoryId: category.id,
      name: category.name
    });

    await settings.save();
  }

  let panel = await Panel.findOne({
    guildId: interaction.guildId
  });

  if (!panel) {
    panel = new Panel({
      guildId: interaction.guildId,
      channelId: panelChannel.id,
      ticketOptions: [],
      embed: {
        title: '🎫 Support Tickets',
        description: 'Select ticket type below',
        color: '#DC143C',
        footer: 'PROGRAMMED BY SUBHAN'
      }
    });
  }

  const already = panel.ticketOptions.find(
    x => x.name === ticketType
  );

  if (!already) {
    panel.ticketOptions.push({
      name: ticketType,
      description: `Open ${ticketType} ticket`,
      categoryId: category.id,
      emoji: '🎫',
      isActive: true
    });
  }

  await panel.save();

  const embed = createTicketPanelEmbed(panel);
  const menu = createTicketSelectMenu(panel.ticketOptions);

  const row = new ActionRowBuilder()
    .addComponents(menu);

  const msg = await panelChannel.send({
    embeds: [embed],
    components: [row]
  });

  panel.messageId = msg.id;
  await panel.save();

  await interaction.editReply({
    content: '✅ Ticket panel created'
  });
}

// ================= PANEL INFO =================
async function handlePanelInfoCommand(interaction) {

  await interaction.deferReply({ ephemeral: true });

  const panel = await Panel.findOne({
    guildId: interaction.guildId
  });

  if (!panel) {
    return interaction.editReply({
      content: '❌ No panel found'
    });
  }

  const embed = new EmbedBuilder()
    .setTitle('📋 Panel Info')
    .setDescription(
      `Channel: <#${panel.channelId}>\n` +
      `Message ID: ${panel.messageId}`
    )
    .setColor('Blue');

  await interaction.editReply({
    embeds: [embed]
  });
}

// ================= CREATE EMBED =================
function createTicketPanelEmbed(panel) {

  return new EmbedBuilder()
    .setTitle(panel.embed.title)
    .setDescription(panel.embed.description)
    .setColor(panel.embed.color);
}

// ================= CREATE MENU =================
function createTicketSelectMenu(options) {

  return new StringSelectMenuBuilder()
    .setCustomId('ticket_select')
    .setPlaceholder('📋 Select Ticket Type')
    .addOptions(
      options.map(opt => ({
        label: opt.name,
        description: opt.description,
        value: opt.name,
        emoji: opt.emoji
      }))
    );
}

// ================= CREATE TICKET =================
async function handleTicketSelection(interaction) {

  await interaction.deferReply({
    ephemeral: true
  });

  const selectedType = interaction.values[0];

  const settings = await Settings.findOne({
    guildId: interaction.guildId
  });

  if (!settings) {
    return interaction.editReply({
      content: '❌ Bot not setup'
    });
  }

  const categoryData = settings.ticketCategories.find(
    x => x.type === selectedType
  );

  if (!categoryData) {
    return interaction.editReply({
      content: '❌ Category not found'
    });
  }

  const channel = await interaction.guild.channels.create({
    name: `${selectedType}-${interaction.user.username}`,
    type: ChannelType.GuildText,
    parent: categoryData.categoryId,
    permissionOverwrites: [
      {
        id: interaction.guild.id,
        deny: ['ViewChannel']
      },
      {
        id: interaction.user.id,
        allow: [
          'ViewChannel',
          'SendMessages',
          'ReadMessageHistory'
        ]
      }
    ]
  });

  const ticket = new Ticket({
    guildId: interaction.guildId,
    userId: interaction.user.id,
    channelId: channel.id,
    ticketType: selectedType,
    status: 'open'
  });

  await ticket.save();

  const embed = new EmbedBuilder()
    .setTitle('🎫 Ticket Created')
    .setDescription(
      `Welcome <@${interaction.user.id}>`
    )
    .setColor('#DC143C');

  const closeBtn = new ButtonBuilder()
    .setCustomId('close_ticket')
    .setLabel('Close')
    .setStyle(ButtonStyle.Danger);

  const claimBtn = new ButtonBuilder()
    .setCustomId('claim_ticket')
    .setLabel('Claim')
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder()
    .addComponents(closeBtn, claimBtn);

  await channel.send({
    embeds: [embed],
    components: [row]
  });

  await interaction.editReply({
    content: `✅ Ticket Created: ${channel}`
  });
}

// ================= CLOSE TICKET =================
async function handleCloseTicket(interaction) {

  await interaction.deferReply({
    ephemeral: true
  });

  const ticket = await Ticket.findOne({
    channelId: interaction.channel.id
  });

  if (!ticket) {
    return interaction.editReply({
      content: '❌ Ticket not found'
    });
  }

  ticket.status = 'closed';
  await ticket.save();

  await interaction.channel.send({
    content: `🔒 Ticket closed by <@${interaction.user.id}>`
  });

  await interaction.editReply({
    content: '✅ Ticket closed'
  });

  setTimeout(async () => {
    await interaction.channel.delete().catch(() => {});
  }, 5000);
}

// ================= CLAIM TICKET =================
async function handleClaimTicket(interaction) {

  await interaction.reply({
    content: `✅ Ticket claimed by <@${interaction.user.id}>`
  });
}

// ================= START =================
async function start() {

  try {

    await connectDatabase();

    await client.login(process.env.DISCORD_TOKEN);

  } catch (error) {

    console.error(error);

  }
}

start();

module.exports = client;
