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

const Ticket = require('./models/Ticket');
const Panel = require('./models/Panel');
const Settings = require('./models/Settings');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ]
});

// ================= MONGODB =================

async function connectDatabase() {

  try {

    await mongoose.connect(process.env.MONGODB_URI);

    console.log('✅ MongoDB Connected');

  } catch (err) {

    console.log('❌ MongoDB Error:', err);

  }

}

// ================= SLASH COMMANDS =================

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
            {
              name: 'Support',
              value: 'support'
            },
            {
              name: 'Buy',
              value: 'buy'
            },
            {
              name: 'Report',
              value: 'report'
            }
          )
      )

      .addChannelOption(option =>
        option
          .setName('category')
          .setDescription('Ticket category')
          .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('panel-info')
      .setDescription('Show ticket panel info')

  ].map(cmd => cmd.toJSON());

  const rest = new REST({
    version: '10'
  }).setToken(process.env.DISCORD_TOKEN);

  try {

    await rest.put(
      Routes.applicationCommands(client.user.id),
      {
        body: commands
      }
    );

    console.log('✅ Slash Commands Registered');

  } catch (err) {

    console.log('❌ Command Register Error:', err);

  }

}

// ================= READY =================

client.on('clientReady', async () => {

  console.log(`✅ Logged in as ${client.user.tag}`);

  client.user.setActivity('🎫 Ticket System');

  client.user.setStatus('online');

  await registerCommands();

  console.log('🚀 Bot Ready');

});

// ================= INTERACTION =================

client.on('interactionCreate', async interaction => {

  try {

    // ================= SLASH COMMANDS =================

    if (interaction.isChatInputCommand()) {

      if (interaction.user.id !== process.env.OWNER_ID) {

        return interaction.reply({
          content: '❌ Only bot owner can use commands',
          flags: 64
        });

      }

      // SETUP

      if (interaction.commandName === 'setup-tickets') {

        await interaction.deferReply({
          flags: 64
        });

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

          .setTitle('✅ Ticket System Setup')

          .setDescription(
            `👑 Admin Role: <@&${adminRole.id}>\n` +
            `🛠 Support Role: <@&${supportRole.id}>\n` +
            `📜 Logs Channel: <#${logsChannel.id}>`
          )

          .setColor('Green');

        return interaction.editReply({
          embeds: [embed]
        });

      }

      // CREATE PANEL

      if (interaction.commandName === 'create-panel') {

        await interaction.deferReply({
          flags: 64
        });

        const panelChannel = interaction.options.getChannel('channel');

        const ticketType = interaction.options.getString('type');

        const category = interaction.options.getChannel('category');

        // CHECK CATEGORY

        if (category.type !== ChannelType.GuildCategory) {

          return interaction.editReply({
            content: '❌ Please select a CATEGORY channel'
          });

        }

        let settings = await Settings.findOne({
          guildId: interaction.guildId
        });

        if (!settings) {

          return interaction.editReply({
            content: '❌ Setup bot first using /setup-tickets'
          });

        }

        // SAVE CATEGORY

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

        // PANEL

        let panel = await Panel.findOne({
          guildId: interaction.guildId
        });

        if (!panel) {

          panel = new Panel({

            guildId: interaction.guildId,

            channelId: panelChannel.id,

            messageId: '',

            ticketOptions: [],

            embed: {

              title: '🎫 Support Tickets',

              description:
                'Select ticket type from dropdown menu below.',

              color: '#5865F2',

              footer: 'PROGRAMMED BY SUBHAN'

            }

          });

        }

        const optionExists = panel.ticketOptions.find(
          x => x.name === ticketType
        );

        if (!optionExists) {

          panel.ticketOptions.push({

            name: ticketType,

            description: `Open ${ticketType} ticket`,

            categoryId: category.id,

            emoji: '🎫',

            isActive: true

          });

        }

        // CREATE EMBED

        const embed = new EmbedBuilder()

          .setTitle(panel.embed.title)

          .setDescription(panel.embed.description)

          .setColor(panel.embed.color)

          .setFooter({
            text: panel.embed.footer
          });

        // MENU

        const menu = new StringSelectMenuBuilder()

          .setCustomId('ticket_select')

          .setPlaceholder('📋 Select ticket type')

          .addOptions(

            panel.ticketOptions.map(opt => ({

              label: opt.name,

              value: opt.name,

              description: opt.description,

              emoji: opt.emoji

            }))

          );

        const row = new ActionRowBuilder()
          .addComponents(menu);

        const msg = await panelChannel.send({

          embeds: [embed],

          components: [row]

        });

        panel.messageId = msg.id;

        panel.channelId = panelChannel.id;

        await panel.save();

        return interaction.editReply({
          content: '✅ Ticket panel created successfully'
        });

      }

      // PANEL INFO

      if (interaction.commandName === 'panel-info') {

        await interaction.deferReply({
          flags: 64
        });

        const panel = await Panel.findOne({
          guildId: interaction.guildId
        });

        if (!panel) {

          return interaction.editReply({
            content: '❌ No panel found'
          });

        }

        const embed = new EmbedBuilder()

          .setTitle('📋 Panel Information')

          .setDescription(
            `📢 Channel: <#${panel.channelId}>\n` +
            `🆔 Message ID: ${panel.messageId}\n` +
            `🎟 Options: ${panel.ticketOptions.length}`
          )

          .setColor('Blue');

        return interaction.editReply({
          embeds: [embed]
        });

      }

    }

    // ================= TICKET MENU =================

    if (interaction.isStringSelectMenu()) {

      if (interaction.customId !== 'ticket_select') return;

      await interaction.deferReply({
        flags: 64
      });

      const selected = interaction.values[0];

      const settings = await Settings.findOne({
        guildId: interaction.guildId
      });

      if (!settings) {

        return interaction.editReply({
          content: '❌ Bot not setup'
        });

      }

      const categoryData = settings.ticketCategories.find(
        x => x.type === selected
      );

      if (!categoryData) {

        return interaction.editReply({
          content: '❌ Ticket category not found'
        });

      }

      // CHECK EXISTING TICKET

      const existing = await Ticket.findOne({

        guildId: interaction.guildId,

        userId: interaction.user.id,

        status: 'open'

      });

      if (existing) {

        return interaction.editReply({
          content: `❌ You already have open ticket <#${existing.channelId}>`
        });

      }

      // CREATE CHANNEL

      const channel = await interaction.guild.channels.create({

        name: `${selected}-${interaction.user.username}`,

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

      // SUPPORT ROLE ACCESS

      for (const roleId of settings.supportRoleIds) {

        await channel.permissionOverwrites.create(roleId, {

          ViewChannel: true,

          SendMessages: true,

          ReadMessageHistory: true

        });

      }

      // SAVE TICKET

      const ticket = new Ticket({

        guildId: interaction.guildId,

        userId: interaction.user.id,

        channelId: channel.id,

        ticketType: selected,

        status: 'open'

      });

      await ticket.save();

      // EMBED

      const embed = new EmbedBuilder()

        .setTitle('🎫 Ticket Created')

        .setDescription(
          `Welcome <@${interaction.user.id}>\n\n` +
          `Support team will help you shortly.`
        )

        .setColor('#5865F2');

      // BUTTONS

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

      return interaction.editReply({
        content: `✅ Ticket created: ${channel}`
      });

    }

    // ================= BUTTONS =================

    if (interaction.isButton()) {

      // CLOSE TICKET

      if (interaction.customId === 'close_ticket') {

        await interaction.deferReply({
          flags: 64
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

      // CLAIM TICKET

      if (interaction.customId === 'claim_ticket') {

        return interaction.reply({

          content:
            `✅ Ticket claimed by <@${interaction.user.id}>`,

          flags: 64

        });

      }

    }

  } catch (err) {

    console.log(err);

  }

});

// ================= START =================

async function start() {

  await connectDatabase();

  await client.login(process.env.DISCORD_TOKEN);

}

start();

module.exports = client;
