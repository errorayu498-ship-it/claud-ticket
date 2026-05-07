const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jwt-simple');
require('dotenv').config();
const helpers = require('./utils/helpers');
const Panel = require('./models/Panel');
const Settings = require('./models/Settings');
const Ticket = require('./models/Ticket');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORTAL_PORT || 3000;
const JWT_SECRET = process.env.PORTAL_SECRET || 'default_secret_key_min_32_characters_long';

// ============ AUTHENTICATION ============
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.decode(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// ============ LOGIN ENDPOINT ============
app.post('/api/login', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }

    const portalPassword = process.env.PORTAL_PASSWORD || 'WarriorTicket@123';
    if (password !== portalPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    const token = jwt.encode(
      {
        user: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 86400 * 7 // 7 days
      },
      JWT_SECRET
    );

    res.json({ token, message: 'Login successful' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ DASHBOARD STATS ============
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const { guildId } = req.query;

    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID required' });
    }

    const openTickets = await Ticket.countDocuments({
      guildId,
      status: 'open'
    });

    const closedTickets = await Ticket.countDocuments({
      guildId,
      status: 'closed'
    });

    const totalTickets = openTickets + closedTickets;
    const settings = await Settings.findOne({ guildId });
    const adminCount = settings?.adminRoleIds?.length || 0;
    const supportCount = settings?.supportRoleIds?.length || 0;

    res.json({
      openTickets,
      closedTickets,
      totalTickets,
      adminRoles: adminCount,
      supportRoles: supportCount,
      botServers: process.env.BOT_SERVERS || 'N/A',
      serverMembers: process.env.SERVER_MEMBERS || 'N/A'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GET PANEL INFO ============
app.get('/api/panel', authenticateToken, async (req, res) => {
  try {
    const { guildId } = req.query;

    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID required' });
    }

    const panel = await Panel.findOne({ guildId });

    if (!panel) {
      return res.json({
        exists: false,
        message: 'No panel found for this guild'
      });
    }

    res.json({
      exists: true,
      panel: {
        messageId: panel.messageId,
        channelId: panel.channelId,
        ticketOptions: panel.ticketOptions,
        embed: panel.embed,
        createdAt: panel.createdAt,
        updatedAt: panel.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ UPDATE PANEL EMBED ============
app.put('/api/panel/embed', authenticateToken, async (req, res) => {
  try {
    const { guildId, embedData } = req.body;

    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID required' });
    }

    let panel = await Panel.findOne({ guildId });

    if (!panel) {
      return res.status(404).json({ error: 'Panel not found' });
    }

    // Update embed properties
    panel.embed.title = embedData.title || panel.embed.title;
    panel.embed.description = embedData.description || panel.embed.description;
    panel.embed.color = embedData.color || panel.embed.color;
    panel.embed.footer = embedData.footer || panel.embed.footer;
    panel.embed.icon = embedData.icon || panel.embed.icon;
    panel.embed.thumbnail = embedData.thumbnail || panel.embed.thumbnail;
    panel.embed.image = embedData.image || panel.embed.image;

    panel.updatedAt = new Date();
    await panel.save();

    res.json({
      success: true,
      message: 'Panel updated successfully',
      embed: panel.embed
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ ADD TICKET OPTION ============
app.post('/api/panel/options', authenticateToken, async (req, res) => {
  try {
    const { guildId, optionName, optionDescription, emoji, categoryId } = req.body;

    if (!guildId || !optionName) {
      return res.status(400).json({ error: 'Guild ID and option name required' });
    }

    let panel = await Panel.findOne({ guildId });

    if (!panel) {
      panel = new Panel({
        guildId,
        ticketOptions: []
      });
    }

    // Check if option already exists
    const exists = panel.ticketOptions.find(opt => opt.name === optionName);
    if (exists) {
      return res.status(409).json({ error: 'Option already exists' });
    }

    panel.ticketOptions.push({
      name: optionName,
      description: optionDescription || `Open a ${optionName} ticket`,
      categoryId: categoryId || '',
      emoji: emoji || '🎯',
      isActive: true
    });

    panel.updatedAt = new Date();
    await panel.save();

    // Also add to settings if not exists
    let settings = await Settings.findOne({ guildId });
    if (settings && categoryId) {
      const categoryExists = settings.ticketCategories.find(c => c.categoryId === categoryId);
      if (!categoryExists) {
        settings.ticketCategories.push({
          categoryId,
          type: optionName,
          name: optionName,
          createdAt: new Date()
        });
        await settings.save();
      }
    }

    res.json({
      success: true,
      message: 'Ticket option added',
      options: panel.ticketOptions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ REMOVE TICKET OPTION ============
app.delete('/api/panel/options/:name', authenticateToken, async (req, res) => {
  try {
    const { guildId } = req.query;
    const { name } = req.params;

    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID required' });
    }

    const panel = await Panel.findOne({ guildId });

    if (!panel) {
      return res.status(404).json({ error: 'Panel not found' });
    }

    panel.ticketOptions = panel.ticketOptions.filter(opt => opt.name !== name);
    panel.updatedAt = new Date();
    await panel.save();

    res.json({
      success: true,
      message: 'Ticket option removed',
      options: panel.ticketOptions
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ UPDATE SETTINGS ============
app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const { guildId, logsChannelId, adminRoleIds, supportRoleIds } = req.body;

    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID required' });
    }

    let settings = await Settings.findOne({ guildId });

    if (!settings) {
      settings = new Settings({ guildId });
    }

    if (logsChannelId) settings.logsChannelId = logsChannelId;
    if (adminRoleIds) settings.adminRoleIds = adminRoleIds;
    if (supportRoleIds) settings.supportRoleIds = supportRoleIds;

    settings.updatedAt = new Date();
    await settings.save();

    res.json({
      success: true,
      message: 'Settings updated',
      settings: {
        logsChannelId: settings.logsChannelId,
        adminRoleIds: settings.adminRoleIds,
        supportRoleIds: settings.supportRoleIds
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GET SETTINGS ============
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const { guildId } = req.query;

    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID required' });
    }

    const settings = await Settings.findOne({ guildId });

    if (!settings) {
      return res.json({
        exists: false,
        message: 'No settings found'
      });
    }

    res.json({
      exists: true,
      settings: {
        logsChannelId: settings.logsChannelId,
        adminRoleIds: settings.adminRoleIds,
        supportRoleIds: settings.supportRoleIds,
        autoCloseOnLeave: settings.autoCloseOnLeave,
        sendDMOnClose: settings.sendDMOnClose,
        ticketCategories: settings.ticketCategories
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GET OPEN TICKETS ============
app.get('/api/tickets/open', authenticateToken, async (req, res) => {
  try {
    const { guildId } = req.query;

    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID required' });
    }

    const tickets = await Ticket.find({
      guildId,
      status: 'open'
    }).sort({ createdAt: -1 }).limit(50);

    res.json({
      count: tickets.length,
      tickets: tickets.map(t => ({
        ticketId: t.ticketId,
        userId: t.userId,
        username: t.username,
        type: t.ticketType,
        channelId: t.channelId,
        createdAt: t.createdAt,
        messages: t.messages
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ GET CLOSED TICKETS ============
app.get('/api/tickets/closed', authenticateToken, async (req, res) => {
  try {
    const { guildId } = req.query;

    if (!guildId) {
      return res.status(400).json({ error: 'Guild ID required' });
    }

    const tickets = await Ticket.find({
      guildId,
      status: 'closed'
    }).sort({ closedAt: -1 }).limit(50);

    res.json({
      count: tickets.length,
      tickets: tickets.map(t => ({
        ticketId: t.ticketId,
        userId: t.userId,
        username: t.username,
        type: t.ticketType,
        closedBy: t.closedBy,
        createdAt: t.createdAt,
        closedAt: t.closedAt,
        duration: calculateDuration(t.createdAt, t.closedAt)
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SERVE FRONTEND ============
app.get('/', (req, res) => {
  res.send(getPortalHTML());
});

// ============ START SERVER ============
async function startPortal() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ Portal MongoDB Connected');

    app.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════╗
║   🎟️  WARRIOR TICKET PORTAL v2.0  🎟️    ║
║   PROGRAMMED BY SUBHAN              ║
╚════════════════════════════════════════╝
      `);
      console.log(`✨ Portal running on http://localhost:${PORT}`);
      console.log(`🔐 Password: ${process.env.PORTAL_PASSWORD || 'WarriorTicket@123'}`);
    });
  } catch (error) {
    console.error('Portal startup error:', error);
    process.exit(1);
  }
}

// ============ HELPER FUNCTIONS ============
function calculateDuration(start, end) {
  const ms = end - start;
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / 1000 / 60) % 60);
  const hours = Math.floor((ms / 1000 / 60 / 60) % 24);
  const days = Math.floor(ms / 1000 / 60 / 60 / 24);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function getPortalHTML() {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Warrior Ticket Portal - Admin Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d1b1b 100%);
            color: #ffffff;
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }

        .login-container {
            max-width: 400px;
            margin: 100px auto;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d1b1b 100%);
            padding: 40px;
            border-radius: 10px;
            border: 2px solid #DC143C;
            box-shadow: 0 0 30px rgba(220, 20, 60, 0.3);
        }

        .login-title {
            text-align: center;
            font-size: 28px;
            margin-bottom: 30px;
            color: #DC143C;
            font-weight: bold;
        }

        .logo {
            text-align: center;
            font-size: 48px;
            margin-bottom: 20px;
        }

        .form-group {
            margin-bottom: 20px;
        }

        label {
            display: block;
            margin-bottom: 8px;
            color: #DC143C;
            font-weight: 600;
        }

        input {
            width: 100%;
            padding: 12px;
            border: 2px solid #DC143C;
            background: #2d1b1b;
            color: #ffffff;
            border-radius: 5px;
            font-size: 16px;
        }

        input:focus {
            outline: none;
            box-shadow: 0 0 10px rgba(220, 20, 60, 0.5);
        }

        button {
            width: 100%;
            padding: 12px;
            background: #DC143C;
            color: white;
            border: none;
            border-radius: 5px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }

        button:hover {
            background: #FF1744;
            box-shadow: 0 0 20px rgba(220, 20, 60, 0.5);
        }

        .dashboard {
            display: none;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #DC143C;
            padding-bottom: 20px;
        }

        .header h1 {
            font-size: 32px;
            color: #DC143C;
        }

        .logout-btn {
            width: auto;
            padding: 10px 20px;
            background: #DC143C;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }

        .stat-card {
            background: linear-gradient(135deg, #2d1b1b 0%, #3d2b2b 100%);
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #DC143C;
            box-shadow: 0 0 20px rgba(220, 20, 60, 0.2);
        }

        .stat-label {
            color: #DC143C;
            font-size: 14px;
            margin-bottom: 10px;
            text-transform: uppercase;
            font-weight: bold;
        }

        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #ffffff;
        }

        .section {
            background: linear-gradient(135deg, #2d1b1b 0%, #3d2b2b 100%);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            border: 2px solid #DC143C;
        }

        .section-title {
            font-size: 20px;
            color: #DC143C;
            margin-bottom: 20px;
            font-weight: bold;
            border-bottom: 2px solid #DC143C;
            padding-bottom: 10px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        .form-row.full {
            grid-template-columns: 1fr;
        }

        .ticket-list {
            max-height: 400px;
            overflow-y: auto;
        }

        .ticket-item {
            background: #1a1a1a;
            padding: 15px;
            margin-bottom: 10px;
            border-left: 4px solid #DC143C;
            border-radius: 5px;
        }

        .ticket-id {
            font-weight: bold;
            color: #DC143C;
        }

        .ticket-user {
            color: #CCCCCC;
            font-size: 14px;
            margin-top: 5px;
        }

        .error {
            background: #DC143C;
            color: white;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            display: none;
        }

        .success {
            background: #00FF00;
            color: black;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            display: none;
            font-weight: bold;
        }

        .loading {
            text-align: center;
            color: #DC143C;
            font-size: 18px;
        }

        ::-webkit-scrollbar {
            width: 8px;
        }

        ::-webkit-scrollbar-track {
            background: #1a1a1a;
        }

        ::-webkit-scrollbar-thumb {
            background: #DC143C;
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: #FF1744;
        }
    </style>
</head>
<body>
    <div id="loginContainer" class="login-container">
        <div class="logo">⚔️</div>
        <div class="login-title">Warrior Ticket Portal</div>
        <form id="loginForm">
            <div class="form-group">
                <label for="password">Portal Password:</label>
                <input type="password" id="password" placeholder="Enter password" required>
            </div>
            <button type="submit">Login</button>
        </form>
        <div id="loginError" class="error" style="margin-top: 20px;"></div>
    </div>

    <div id="dashboard" class="dashboard">
        <div class="container">
            <div class="header">
                <h1>⚔️ Warrior Ticket Portal</h1>
                <button class="logout-btn" onclick="logout()">Logout</button>
            </div>

            <div id="errorMsg" class="error"></div>
            <div id="successMsg" class="success"></div>

            <div class="form-group full">
                <label for="guildId">Server ID:</label>
                <input type="text" id="guildId" placeholder="Enter your server ID" onchange="loadDashboardData()">
            </div>

            <div class="stats-grid" id="statsGrid">
                <div class="stat-card">
                    <div class="stat-label">Open Tickets</div>
                    <div class="stat-value" id="openTickets">0</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Closed Tickets</div>
                    <div class="stat-value" id="closedTickets">0</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Total Tickets</div>
                    <div class="stat-value" id="totalTickets">0</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Admin Roles</div>
                    <div class="stat-value" id="adminRoles">0</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">📋 Panel Configuration</div>
                <div id="panelInfo" class="loading">Loading panel information...</div>
            </div>

            <div class="section">
                <div class="section-title">⚙️ Settings</div>
                <div class="form-row full">
                    <div class="form-group">
                        <label for="logsChannel">Logs Channel ID:</label>
                        <input type="text" id="logsChannel" placeholder="Enter logs channel ID">
                    </div>
                </div>
                <button onclick="updateSettings()" style="width: 200px;">Save Settings</button>
            </div>

            <div class="section">
                <div class="section-title">🎫 Open Tickets</div>
                <div id="openTicketsList" class="ticket-list loading">Loading tickets...</div>
            </div>

            <div class="section">
                <div class="section-title">✅ Closed Tickets</div>
                <div id="closedTicketsList" class="ticket-list loading">Loading tickets...</div>
            </div>
        </div>
    </div>

    <script>
        let authToken = localStorage.getItem('portalToken');

        if (authToken) {
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
        }

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('password').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });

                const data = await response.json();

                if (response.ok) {
                    authToken = data.token;
                    localStorage.setItem('portalToken', authToken);
                    document.getElementById('loginContainer').style.display = 'none';
                    document.getElementById('dashboard').style.display = 'block';
                    showSuccess('Login successful!');
                } else {
                    showError(data.error || 'Login failed');
                }
            } catch (error) {
                showError('Connection error: ' + error.message);
            }
        });

        async function loadDashboardData() {
            const guildId = document.getElementById('guildId').value;
            if (!guildId) {
                showError('Please enter a server ID');
                return;
            }

            try {
                // Load stats
                const statsRes = await apiCall('/api/dashboard/stats?guildId=' + guildId, 'GET');
                if (statsRes) {
                    document.getElementById('openTickets').textContent = statsRes.openTickets || 0;
                    document.getElementById('closedTickets').textContent = statsRes.closedTickets || 0;
                    document.getElementById('totalTickets').textContent = statsRes.totalTickets || 0;
                    document.getElementById('adminRoles').textContent = statsRes.adminRoles || 0;
                }

                // Load open tickets
                const openRes = await apiCall('/api/tickets/open?guildId=' + guildId, 'GET');
                if (openRes) {
                    const html = openRes.tickets.map(t => \`
                        <div class="ticket-item">
                            <div class="ticket-id">\${t.ticketId}</div>
                            <div class="ticket-user">User: <strong>\${t.username}</strong> | Type: <strong>\${t.type}</strong></div>
                        </div>
                    \`).join('');
                    document.getElementById('openTicketsList').innerHTML = html || '<p style="color: #999;">No open tickets</p>';
                }

                // Load closed tickets
                const closedRes = await apiCall('/api/tickets/closed?guildId=' + guildId, 'GET');
                if (closedRes) {
                    const html = closedRes.tickets.map(t => \`
                        <div class="ticket-item">
                            <div class="ticket-id">\${t.ticketId}</div>
                            <div class="ticket-user">User: <strong>\${t.username}</strong> | Duration: <strong>\${t.duration}</strong></div>
                        </div>
                    \`).join('');
                    document.getElementById('closedTicketsList').innerHTML = html || '<p style="color: #999;">No closed tickets</p>';
                }

                showSuccess('Dashboard updated!');
            } catch (error) {
                showError(error.message);
            }
        }

        async function updateSettings() {
            const guildId = document.getElementById('guildId').value;
            const logsChannel = document.getElementById('logsChannel').value;

            if (!guildId) {
                showError('Please enter a server ID');
                return;
            }

            try {
                const response = await apiCall('/api/settings', 'PUT', {
                    guildId,
                    logsChannelId: logsChannel
                });

                if (response) {
                    showSuccess('Settings updated successfully!');
                }
            } catch (error) {
                showError(error.message);
            }
        }

        async function apiCall(url, method = 'GET', body = null) {
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + authToken
                }
            };

            if (body) {
                options.body = JSON.stringify(body);
            }

            const response = await fetch(url, options);

            if (!response.ok && response.status === 401) {
                logout();
                throw new Error('Session expired');
            }

            return await response.json();
        }

        function logout() {
            localStorage.removeItem('portalToken');
            authToken = null;
            document.getElementById('dashboard').style.display = 'none';
            document.getElementById('loginContainer').style.display = 'block';
            document.getElementById('password').value = '';
        }

        function showError(msg) {
            const el = document.getElementById('errorMsg');
            el.textContent = msg;
            el.style.display = 'block';
            setTimeout(() => el.style.display = 'none', 5000);
        }

        function showSuccess(msg) {
            const el = document.getElementById('successMsg');
            el.textContent = msg;
            el.style.display = 'block';
            setTimeout(() => el.style.display = 'none', 5000);
        }
    </script>
</body>
</html>
  `;
}

startPortal();
module.exports = app;
