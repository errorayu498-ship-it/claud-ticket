# 🎟️ Warrior Ticket Bot v2.0

A **professional-grade Discord ticket support bot** with an advanced web portal for management. Perfect for server support, sales, and customer management.

![Status](https://img.shields.io/badge/status-production-brightgreen)
![Version](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-18+-brightgreen)

---

## ✨ Key Features

### 🤖 Discord Bot
- ✅ **Premium Embeds** - Beautiful, fully customizable ticket panels
- ✅ **Dropdown Menus** - Easy ticket type selection
- ✅ **MongoDB Persistence** - Data survives bot restarts
- ✅ **Auto-Close** - Tickets auto-close if user leaves
- ✅ **DM Notifications** - Users notified when tickets close
- ✅ **Logging System** - All actions logged to specific channel
- ✅ **Role-Based Access** - Admin and Support role system
- ✅ **Category System** - Organize tickets by type
- ✅ **Error Handling** - Comprehensive error management
- ✅ **Custom Emojis** - Configure bot emojis without code

### 🌐 Web Portal
- 🔐 **Password Protected** - Secure admin dashboard
- 📊 **Real-time Stats** - Live ticket and member counts
- 🎯 **Panel Management** - Create and edit ticket panels
- ✏️ **Embed Editor** - Customize panel appearance
- 👥 **Role Management** - Configure permissions
- 📝 **Ticket History** - View open and closed tickets
- 🎨 **Premium UI** - Red & Black professional theme
- 📱 **Responsive Design** - Works on mobile & desktop

---

## 🚀 Quick Start

### ⚡ 10-Minute Setup

1. **Get Bot Token**
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create bot → Copy token

2. **Create MongoDB**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create FREE cluster → Copy connection string

3. **Setup Bot**
   ```bash
   git clone https://github.com/yourusername/warrior-ticket-bot
   cd warrior-ticket-bot
   npm install
   cp .env.example .env
   # Edit .env with your values
   ```

4. **Run Locally**
   ```bash
   # Terminal 1
   npm start
   
   # Terminal 2
   node portal.js
   ```

5. **Deploy to Railway**
   - Push to GitHub
   - Deploy on [Railway.app](https://railway.app)
   - Add environment variables

📖 **[Full Setup Guide](./SETUP_GUIDE.md)** | 📖 **[Quick Start](./QUICK_START.md)**

---

## 📋 Requirements

- **Node.js** v18+
- **MongoDB** (FREE Atlas tier works)
- **Discord Server** for testing
- **Railway Account** for deployment (optional, can run locally)

---

## 🎯 Bot Commands

### Owner Only
```
/setup-tickets admin_role support_role logs_channel
  → Configure bot for your server

/create-panel channel type category
  → Create ticket selection panel

/panel-info
  → Show panel information
```

---

## 🌐 Portal Features

Access at `http://localhost:3000` (local) or Railway domain

**Dashboard**
- 📊 Real-time ticket statistics
- 📋 Open & closed ticket lists
- ⚙️ Server configuration
- 👥 Role management

**Panel Management**
- ✏️ Edit embed title, description, color
- 🎨 Add/remove ticket types
- 🖼️ Custom thumbnail & image
- 💾 Auto-save changes

**Settings**
- 🔧 Change logs channel
- 👮 Configure admin roles
- 👥 Configure support roles
- 📩 DM notification settings

---

## 📁 Project Structure

```
warrior-ticket-bot/
├── bot.js                 # Main Discord Bot
├── portal.js             # Web Portal Server
├── config.js             # Configuration
├── emoji.json            # Bot Emojis
├── models/
│   ├── Ticket.js         # Ticket Schema
│   ├── Panel.js          # Panel Schema
│   └── Settings.js       # Settings Schema
├── utils/
│   ├── logger.js         # Logging System
│   └── helpers.js        # Utilities
├── SETUP_GUIDE.md        # Full Setup Guide
├── QUICK_START.md        # Quick Start
├── package.json
├── .env.example
└── Procfile              # Railway Config
```

---

## 🔧 Configuration

### Environment Variables (.env)

```env
# Discord Bot
DISCORD_TOKEN=your_bot_token

# Database
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/db

# Portal
PORTAL_PASSWORD=YourSecurePassword
PORTAL_SECRET=min32characterslong

# Discord IDs
OWNER_ID=your_discord_id
LOGS_CHANNEL_ID=logs_channel_id
ADMIN_ROLE_ID=admin_role_id
SUPPORT_ROLE_IDS=support_role_id
SERVER_ID=your_server_id
```

---

## 🎨 Customization

### Change Bot Emojis
Edit `emoji.json`:
```json
{
  "ticket": "🎟️",
  "success": "✅",
  "support": "🎯"
}
```

### Customize Panel
Via Portal Dashboard:
- Change title, description
- Modify embed color (#DC143C for red)
- Add custom thumbnail/image
- Configure ticket types

### Add Ticket Types
Via Portal or `/create-panel` command:
- Support
- Billing
- Reports
- Custom types

---

## 🚀 Deployment

### Local Development
```bash
npm install
npm start          # Terminal 1: Bot
node portal.js     # Terminal 2: Portal
```

### Railway Production
1. Push to GitHub
2. Connect Railway to GitHub repo
3. Add environment variables
4. Auto-deploys on push
5. Portal URL: `https://your-app.railway.app`

---

## 🔒 Security Features

- ✅ **Password Protected** Portal
- ✅ **JWT Authentication** for portal
- ✅ **Environment Variables** for secrets
- ✅ **Role-Based Access** Control
- ✅ **Error Handling** (no sensitive data leaked)
- ✅ **HTTPS Support** (Railway)

---

## 📊 Monitoring

### Logs Channel
All bot activity logged:
- ✅ Ticket created
- ✅ Ticket closed
- ❌ User left (auto-close)
- ✏️ Panel updated
- ⚠️ Errors

### Portal Dashboard
Real-time statistics:
- Open ticket count
- Closed ticket count
- Member information
- Admin role assignments

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Bot won't start | Check DISCORD_TOKEN in .env |
| MongoDB error | Verify MONGODB_URI format |
| Portal won't load | Check port 3000 is available |
| Tickets not saving | Ensure MongoDB is connected |
| DM not sending | User may have DMs disabled |
| No permissions | Bot needs Administrator permission |

👉 **[Full Troubleshooting Guide](./SETUP_GUIDE.md#-troubleshooting)**

---

## 📞 Support

- 📖 Check [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- ⚡ Try [QUICK_START.md](./QUICK_START.md)
- 💬 Check console errors
- 🔍 Verify all environment variables

---

## 📜 License

MIT License - Feel free to use, modify, and distribute

---

## 👨‍💻 Creator

**PROGRAMMED BY SUBHAN** ⚔️

- Discord Bot Development
- Web Portal Management
- MongoDB Integration
- Railway Deployment Ready

---

## 🎁 What's Included

✅ Full Discord Bot  
✅ Admin Web Portal  
✅ MongoDB Integration  
✅ Complete Documentation  
✅ Setup Guides  
✅ Error Handling  
✅ Emoji Configuration  
✅ Role Management  
✅ Logging System  
✅ Portal Authentication  

---

## 🌟 Star & Fork

If you found this helpful, please ⭐ this repository!

---

**Version:** 2.0.0  
**Status:** Production Ready  
**Last Updated:** 2024

---

## 📧 Questions?

- Check documentation first
- Look in QUICK_START.md
- Check SETUP_GUIDE.md
- Review error messages

---

**Made with ❤️ for Discord Communities**

⚔️ **Warrior Ticket Bot** - Professional Ticket Management System
