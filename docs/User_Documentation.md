# Reporting Platform - User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Main Features](#main-features)
5. [Step-by-Step Usage](#step-by-step-usage)
6. [Dashboard Overview](#dashboard-overview)
7. [Services & Reports](#services--reports)
8. [Settings & Administration](#settings--administration)
9. [Common Issues & FAQ](#common-issues--faq)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is the Reporting Platform?

The Reporting Platform is a comprehensive business management system designed to help teams:

- **Manage clients and user hierarchies** with granular access controls
- **Track campaigns** across multiple channels (voicemail, email, calls, AI calling)
- **View integrated reports** from various third-party platforms
- **Assign work** to team members based on roles and permissions
- **Monitor activity** with comprehensive audit logs
- **Customize settings** for branding, notifications, and integrations

Think of it as a **central hub** where your organization can:
- See all client information in one place
- Access reports from different marketing and calling platforms
- Manage team members and their access levels
- Track who did what and when

### Key Capabilities

✅ **Multi-role user management** – SuperAdmin, Account Manager, Admin, Telecaller roles
✅ **Client-centric organization** – Group all reports and users by client
✅ **Multiple integrations** – DropCowboy (Voicemail), Mautic (Email/CRM), VICIdial (Calling)
✅ **AI Agent support** – Integration with AI-powered calling platforms
✅ **Real-time dashboards** – See key metrics at a glance
✅ **Activity logging** – Complete audit trail of all actions
✅ **Flexible permissions** – Create custom roles with specific permissions

---

## Getting Started

### Step 1: Login

1. Open the Reporting Platform in your browser
2. Enter your **email address** and **password**
3. Click **"Sign In"**

> **Tip:** If you forgot your password, click "Reset Password" and follow the email instructions.

### Step 2: First-Time Setup (Super Admin Only)

The **very first user** to sign up becomes the **Super Admin**. This person:
- Can create all other users
- Has full access to all features
- Can assign clients and manage roles

### Step 3: Explore the Dashboard

Once logged in, you'll see:

- **Main Dashboard** – Shows overview metrics
- **Clients** – All clients your role allows you to see
- **Services** – Integrated platforms (Voicemail, Email, Calls, AI)
- **Employees** – User management (if authorized)
- **Settings** – Configuration options (if authorized)
- **Activities** – Audit log of actions

---

## User Roles & Permissions

### How Roles Work

The platform uses a **flexible role-based access system**:

- **One Built-in Role:** SuperAdmin (Owner) – automatically assigned to the first user
- **Custom Roles:** The SuperAdmin can create any number of custom roles with specific permissions
- **Role Types:** 
  - Full Access roles (equivalent to SuperAdmin)
  - Custom roles (with granular permission control)
  - Team Manager roles (users appear in manager dropdown for client assignments)

---

### Built-in Role: SuperAdmin (Owner)

#### 🔴 Super Admin

**What they can do:**
- ✅ Full access to all features and settings
- ✅ Create, edit, delete all users
- ✅ Create custom roles and manage permissions
- ✅ Manage all clients and assign them to users
- ✅ View all reports across all clients
- ✅ Configure integrations (SMTP, SFTP, VICIdial, Mautic, AI)
- ✅ Customize site branding (logo, title, login page)
- ✅ View complete activity logs

**Protection:**
- ❌ Cannot delete themselves – The primary SuperAdmin account is protected
- ⚠️ Use this account only for administrative tasks

**Use case:** Platform owner/administrator who needs full system access

---

### Custom Roles (Created by SuperAdmin)

The SuperAdmin can create custom roles for different needs. Here are some common examples:

#### Example 1: 🟠 Account Manager

**Permissions:**
- Pages: Dashboard, Clients, Users, Services, Activities, Settings
- Users: Create, Read, Update (but not Delete)
- Clients: Create, Read, Update
- Settings: Limited (only Notifications, Mautic/VICIdial Credentials)
- Team Manager: ✅ Yes (appears in manager dropdown)

**Use case:** Department head managing multiple clients and their team

---

#### Example 2: 🟡 Admin / Team Lead

**Permissions:**
- Pages: Dashboard, Clients, Services, Activities
- Users: Read only
- Clients: Read only
- Settings: None
- Team Manager: ✅ Yes (can manage team members)

**Use case:** Team lead who can view assigned clients and manage their team

---

#### Example 3: 🟢 Report Viewer / Telecaller

**Permissions:**
- Pages: Dashboard, Services
- Users: Read only
- Clients: Read only
- Settings: None
- Team Manager: ❌ No

**Use case:** Front-line employee who can only view reports and metrics

---

### Creating & Managing Custom Roles

**How to create a custom role:**

1. Go to **Settings** → **Roles & Permissions**
2. Click **"New Role"** button
3. Enter:
   - **Role Name** – e.g., "Campaign Manager"
   - **Description** – Optional explanation
   - **Full Access** – Toggle ON to grant all permissions (equivalent to SuperAdmin)
   - **Team Manager** – Toggle ON if users with this role should appear in manager dropdown
4. If NOT using Full Access:
   - Click **"Permissions"** tab
   - Select specific permissions for:
     - **Pages** they can access
     - **Users** CRUD operations they can perform
     - **Clients** CRUD operations they can perform
     - **Settings** they can manage
5. Click **"Save"**

**Now you can assign this role to new users!**

---

### Permission Breakdown

Each custom role can control access to:

#### Pages (What sections they see)
- Dashboard – Main dashboard with metrics
- Clients – Client list and management
- Users – Employee/user management
- Services – Integrated platform reports (DropCowboy, Mautic, VICIdial)
- Activities – Audit log and activity history
- Settings – System configuration

#### Users Operations
- **Create** – Can add new users
- **Read** – Can view existing users
- **Update** – Can edit user details and assignments
- **Delete** – Can remove users

#### Clients Operations
- **Create** – Can add new clients
- **Read** – Can view clients
- **Update** – Can edit client details
- **Delete** – Can remove clients

#### Settings Categories
- **Roles** – Manage roles and permissions
- **Notifications** – Configure notification settings
- **SMTP Credentials** – Email server settings
- **SFTP Credentials** – DropCowboy voicemail sync settings
- **VICIdial Credentials** – Call center integration
- **Mautic Credentials** – Email/CRM integration
- **Site Customization** – Logo, branding, login page
- **AI Assistant** – AI agent configuration

---

### Key Concepts

**Full Access**
- Grants all permissions automatically
- Equivalent to SuperAdmin (but without the protected status)
- Cannot delete themselves unless explicitly removed by another user
- Useful for backup administrators

**Team Manager**
- Makes users visible in the "Manager" dropdown when assigning clients
- Allows them to assign clients to employees
- Does NOT automatically grant other permissions – must also specify other permissions

**Example Workflow:**
1. SuperAdmin creates "Account Manager" role with:
   - Full Access: ❌ OFF
   - Team Manager: ✅ ON
   - Specific Permissions: Users.Create, Clients.Read, etc.
2. SuperAdmin creates user "Alice" with "Account Manager" role
3. When another user assigns a client, "Alice" appears in the Manager dropdown
4. Alice can only access the pages and perform the actions specified in the role

---

## Main Features

### 1. Dashboard

The main landing page showing at-a-glance metrics:

- **Total Clients** – Number of clients in the system
- **Total Employees** – Number of team members
- **Total Managers** – Number of management-level users
- **Recent Activities** – Latest 10 actions in the system

> **Note:** What you see depends on your role. A Telecaller only sees their assigned clients.

---

### 2. Clients

View and manage clients within the system.

**For Super Admin / Managers:**
- ✅ Create new clients
- ✅ Edit client details
- ✅ Delete clients
- ✅ Assign clients to users
- ✅ View all clients

**For Team Members:**
- ✅ View assigned clients only
- ❌ Cannot create or delete

**Client Types:**
- **General** – Standard client
- **DropCowboy** – Voicemail platform integration
- **Mautic** – CRM/Email platform integration
- **VICIdial** – Call center platform integration

---

### 3. Services & Reports

Access integrated platforms to view campaign reports:

#### **Ringless Voicemail (DropCowboy)**

📊 **What you see:**
- Campaign metrics (total sent, failed, bounced)
- Call status breakdown (connected, no answer, callback, etc.)
- Per-record details (phone number, status, cost)
- Sync history and logs
- Cost analytics

🔧 **What you can do:**
- Search and filter campaigns
- Export campaign data
- View detailed record information
- Check sync logs
- Trigger manual data refresh

---

#### **Email Campaigns (Mautic)**

📊 **What you see:**
- Email statistics (sent, opened, clicked, bounced)
- Campaign performance metrics
- Segment and contact data
- Email delivery reports

🔧 **What you can do:**
- View email metrics per campaign
- See open and click rates
- Track unsubscribes and bounces
- View contact engagement

---

#### **Telecalling (VICIdial)**

📊 **What you see:**
- Agent performance metrics (calls, talk time, pause time)
- Campaign assignments per agent
- Agent status (active/inactive)
- Call statistics and session data

🔧 **What you can do:**
- View agent dashboards
- See campaign assignments
- Check performance statistics
- Export agent data
- Filter and search agents

---

#### **AI Agent Calling**

🤖 **What you see:**
- AI-powered calling campaign reports
- Call outcomes and analytics
- Voice quality metrics (if configured)
- Conversation data

---

### 4. Employees / Users

Manage team members and their access levels.

**Super Admin / Authorized Users can:**
- ✅ Create new users with assigned roles
- ✅ Edit user details
- ✅ Deactivate/reactivate users
- ✅ Assign users to clients
- ✅ Manage manager-employee relationships
- ✅ Delete users (Super Admin only)

**Regular Users can:**
- ✅ View basic profile information
- ✅ See team members in their hierarchy

---

### 5. Activities / Audit Log

See a complete history of **who did what and when**:

- **User Created** – When a new user was added
- **User Updated** – When user details changed
- **User Deleted** – When a user was removed
- **Client Created** – When a new client was created
- **Client Assigned** – When a client was assigned to a user
- **Login / Logout** – User session events

> **Use case:** Compliance tracking, troubleshooting, security audits

---

### 6. Settings

Configure system-wide options (access depends on your role):

#### **Site Customization**
- Change site title and branding
- Upload logo and favicon
- Customize login page background

#### **User & Role Management**
- Create custom roles
- Define permissions for each role
- Manage user accounts

#### **Email Settings (SMTP)**
- Configure email server credentials
- Set notification preferences
- Enable/disable email notifications

#### **Voicemail Integration (SFTP)**
- Connect DropCowboy SFTP account
- Configure file sync settings

#### **VICIdial Integration**
- Set up VICIdial API credentials
- Sync agent and campaign data

#### **Mautic Integration**
- Add Mautic CRM credentials
- Configure email sync

#### **AI Agent Settings** (Super Admin only)
- Configure LLM provider (OpenAI, Anthropic, etc.)
- Set voice provider (ElevenLabs, etc.)
- Customize AI agent name and settings

---

## Step-by-Step Usage

### Scenario 1: Super Admin Creating a New User

1. Go to **Employees** page
2. Click **"Add New Employee"** button
3. Fill in:
   - **Name** – Full name
   - **Email** – Unique email address
   - **Password** – Secure password (requirements shown)
   - **Phone** (optional)
   - **Role** – Select from available roles
4. **Optional:** Assign manager(s) if creating an employee
5. Click **"Create User"**
6. User receives email notification with login instructions

> **Tip:** After creation, you can assign clients to the user from the Clients page.

---

### Scenario 2: Viewing a Client's Reports

1. Go to **Clients**
2. Find and click on the client name
3. On the client detail page, select the service:
   - **Voicemail** – DropCowboy ringless voicemail reports
   - **Email** – Mautic campaign reports
   - **Calls** – VICIdial agent reports
4. Use filters to narrow data:
   - Search by campaign name / agent name
   - Filter by date range
   - Filter by status
5. Click **"Export"** to download data (where available)

---

### Scenario 3: Assigning a Client to an Employee

**Super Admin / Authorized Manager:**

1. Go to **Clients**
2. Click on the client
3. Scroll to **"Assigned Users"** section
4. Click **"Assign Client"** or **"+"** button
5. Select the manager (dropdown will show available managers)
6. Optionally select employees under that manager
7. Click **"Confirm"** or **"Assign"**
8. Employee receives email notification

---

### Scenario 4: Creating a Custom Role

**Super Admin only:**

1. Go to **Settings** → **Roles & Permissions**
2. Click **"Create New Role"**
3. Enter role details:
   - **Role Name** – e.g., "Report Viewer"
   - **Description** – Optional explanation
4. Choose access level:
   - ☑️ **Full Access** – Same as Admin (unrestricted)
   - ☑️ **Team Manager** – Users can manage employees
   - Choose specific permissions for each module
5. Select permissions:
   - **Pages:** Which main pages they can access
   - **Users:** Can they Create/Read/Update/Delete users?
   - **Clients:** Can they Create/Read/Update/Delete clients?
   - **Settings:** Which settings can they configure?
6. Click **"Save Role"**
7. Now you can assign this role to new users

---

### Scenario 5: Exporting Agent Performance Data

**VICIdial Dashboard:**

1. Go to **Services** → **Telecalling**
2. Click **"Export"** button (top right)
3. File format: **CSV** (opens in Excel)
4. Data includes:
   - Agent ID and name
   - Status, campaigns, calls
   - Talk time, pause time, dispo time
   - Sessions, pauses, performance ratios

---

## Dashboard Overview

### Super Admin Dashboard

Shows organization-wide metrics:

```
┌─────────────────────────────────────────┐
│  Total Clients: 15                      │
│  Total Employees: 47                    │
│  Total Managers: 5                      │
└─────────────────────────────────────────┘

┌─ Recent Activities ─────────────────────┐
│ • User "John Smith" logged in (2 min)   │
│ • Client "Acme Corp" was assigned (1hr) │
│ • Role "Sales Manager" was created (3h) │
│ • User "Jane Doe" was updated (5h)      │
└─────────────────────────────────────────┘
```

### Manager Dashboard

Shows metrics for assigned clients and team:

```
┌─────────────────────────────────────────┐
│  My Clients: 8                          │
│  My Employees: 12                       │
│  Active Clients: 7                      │
└─────────────────────────────────────────┘
```

### Employee Dashboard

Shows assigned clients only:

```
┌─────────────────────────────────────────┐
│  My Clients: 3                          │
│  Active Clients: 3                      │
└─────────────────────────────────────────┘
```

---

## Services & Reports

### DropCowboy Voicemail Dashboard

**Metrics at a glance:**

| Metric | Description |
|---------|-------------|
| **Total Voicemails Sent** | The total number of ringless voicemails sent across all filtered campaigns. |
| **Successful Deliveries** | The number of voicemails successfully delivered to recipients. Also shows the delivery rate percentage. |
| **Failed Deliveries** | The number of voicemails that failed to send due to invalid numbers, carrier errors, or network issues. Shows the failure rate percentage. |
| **Other Status** | The count of records with statuses other than “Delivered” or “Failed” (e.g., pending, queued, unknown). Shows their rate percentage. |
| **Total Campaign Cost (SuperAdmin/Full Access Roles only)** | Displays the total spend on voicemail campaigns. Visible only to Super Admin users. |

**How to use:**

1. Select a campaign from the dropdown
2. View metrics for that campaign
3. Click on metrics to see detailed records
4. Use **Date Range** filter to view specific periods
5. Search by phone number, status, or other criteria
6. Click **"Manual Sync"** to refresh data immediately

> **Note:** Data syncs automatically on a schedule. Manual sync ensures fresh data.

---

### Mautic Email Dashboard

**Metrics at a glance:**

| Metric | Description |
|--------|-------------|
| Total Sent | Emails sent from campaigns |
| Total Opened | Unique opens |
| Total Clicked | Click-through count |
| Open Rate | % of emails opened |
| Click Rate | % of emails clicked |
| Bounced | Failed delivery |
| Unsubscribed | Opt-outs |

**How to use:**

1. Select a client
2. View all email campaigns for that client
3. Click on a campaign to see details
4. View engagement metrics (opens, clicks, etc.)
5. See contact-level data
6. Track campaign performance over time

---

### VICIdial Calling Dashboard

**Metrics at a glance:**

| Metric | Description |
|--------|-------------|
| Total Calls | Number of calls made |
| Login Time | How long agent was logged in |
| Talk Time | Time spent on calls |
| Pause Time | Time in pause state |
| Dispo Time | Time between calls |
| Sessions | Number of work sessions |
| Avg Session Length | Average session duration |

**How to use:**

1. Browse the agent list
2. Search for an agent by name or ID
3. Click an agent row to view their assigned campaigns
4. Click **"View Stats"** to see performance metrics
5. Use date range filters to view historical data
6. Compare talk time, pause time, and other KPIs
7. Export all agent data to CSV

---

## Settings & Administration

### Notification Settings

Configure how you want to be notified:

- Email Notifications – On/Off
- Task Deadline Reminders – On/Off
- Overdue Task Alerts – On/Off
- Project Status Updates – On/Off
- Weekly Reports – On/Off (set day and time)
- Activity Emails – On/Off

> **Tip:** Most users turn on weekly reports for a summary each Friday.

---

### User & Role Management

**Create a role:**
1. Settings → Roles & Permissions
2. Click "Create Role"
3. Define name, permissions
4. Click "Save"

**Assign a role to a user:**
1. Employees page
2. Click user edit button
3. Select role from dropdown
4. Click "Update"

**Deactivate a user:**
1. Employees page
2. Click user row
3. Toggle "Active" status
4. Click "Update"

> **Note:** Deactivated users cannot login but their data is preserved.

---

### Email Notification Setup (SMTP)

If you need the system to send emails:

1. Settings → SMTP Credentials
2. Enter mail server details:
   - SMTP Host
   - SMTP Port (usually 587 or 465)
   - Username & Password
   - From Address
3. Click "Save"
4. System will test connection

---

### VICIdial Integration Setup

To sync agent and campaign data:

1. Settings → VICIdial Credentials
2. Enter VICIdial API details:
   - API URL
   - Username & Password
3. Click "Save"
4. System syncs agent data automatically

---

### Mautic Integration Setup

To pull email campaign reports:

1. Settings → Mautic Configuration
2. Add Mautic instance details:
   - Mautic URL
   - API credentials
3. Click "Save"
4. Go to Services → Email to view campaigns

---

## Common Issues & FAQ

### Q1: I can't see a client that was assigned to me

**A:**
- Check if the assignment is still active (ask your manager)
- Clear browser cache and refresh
- Log out and log back in
- Contact your Super Admin

---

### Q2: I forgot my password

**A:**
1. Click **"Forgot Password?"** on login screen
2. Enter your email address
3. Check your email for reset link
4. Click link and create new password
5. Log in with new password

> **Note:** Reset links expire after 24 hours.

---

### Q3: Why can't I see all users?

**A:**
This depends on your role and permissions:
- **Super Admin** – See all users
- **Managers** – See employees under their clients
- **Employees** – See only limited information

Ask your Super Admin if you need additional access.

---

### Q4: How often does data sync automatically?

**A:**
- **DropCowboy:** Every 6 hours
- **Mautic:** Every 12 hours
- **VICIdial:** Every 30 minutes
- **Manual sync:** Available anytime

You can click **"Refresh"** or **"Manual Sync"** to get data immediately.

---

### Q5: Can I export reports?

**A:**
Yes! Most dashboards have an **"Export"** button:
- ✅ VICIdial agent data → CSV
- ✅ DropCowboy voicemail records → CSV
- ⚠️ Mautic email reports → Limited export

Exported files open in Excel.

---

### Q6: What if I see an error message?

**A:**
Common errors and solutions:

| Error | Solution |
|-------|----------|
| "Authentication failed" | Re-login or contact admin |
| "Integration not configured" | Ask super admin to set up API credentials |
| "No data available" | Check date range or campaign selection |
| "Permission denied" | Check your role or contact super admin |

---

### Q7: Can I change my email address?

**A:**
- **Super Admin:** Can edit any user's email (Employees page)
- **Regular users:** Contact your super admin

> **Note:** Emails must be unique in the system.

---

### Q8: How do I reset another user's password?

**A:**
**Super Admin only:**
1. Go to Employees page
2. Click the user
3. Click **"Reset Password"** button
4. User will receive password reset email

---

### Q9: What's the difference between "Deactivate" and "Delete"?

**A:**
- **Deactivate** – User can't login, but data is preserved. Reversible.
- **Delete** – Permanently removes user and some associated data. Not reversible.

Use **Deactivate** unless you're sure about permanent deletion.

---

### Q10: Why is my dashboard empty?

**A:**
Possible reasons:
- No clients assigned to you yet (contact your manager)
- You just created the account (assignments may take a moment)
- Your role doesn't have access to that view
- Data hasn't synced yet

Try refreshing the page or logging out/in.

---

## Troubleshooting

### Issue: Reports not loading

**Try these steps:**
1. Refresh the page (F5 or Cmd+R)
2. Clear browser cache:
   - Chrome: Settings → Clear Browsing Data
   - Safari: Develop → Empty Caches
   - Firefox: History → Clear Recent History
3. Try a different browser
4. Check your internet connection
5. Contact support if still not working

---

### Issue: Can't upload/import data

**Try these steps:**
1. Ensure file format is correct (CSV, etc.)
2. Check file size isn't too large (max 50MB)
3. Close and reopen the form
4. Try on a different device
5. Contact your Super Admin

---

### Issue: Receiving too many emails

**Solution:**
1. Go to Settings → Notification Settings
2. Toggle off notifications you don't need
3. Save changes

---

### Issue: Performance is slow

**Try these steps:**
1. Close other browser tabs
2. Clear browser cache and cookies
3. Try using a different browser
4. Check your internet speed
5. Try accessing during off-peak hours

---

### Issue: Integration not working (DropCowboy, Mautic, VICIdial)

**For Super Admin:**
1. Go to Settings
2. Verify credentials are correct
3. Check that API keys are valid
4. Test connection (usually a "Test" button)
5. Check integration logs for errors

**For regular users:**
- Contact your Super Admin

---

### Getting Help

If you encounter issues:

1. **Check this documentation** – Many common issues are covered here
2. **Check the dashboard activities** – See if actions completed successfully
3. **Contact your Super Admin** – They can check logs and permissions
4. **Contact support** – Provide screenshots and error messages

> **Helpful info to provide when contacting support:**
> - Your role and username
> - What you were trying to do
> - Error message (if any)
> - Screenshot of the issue
> - When the issue started

---

## Tips & Best Practices

### ✅ Do's

- ✅ Change your password regularly
- ✅ Log out when finished (especially on shared devices)
- ✅ Use descriptive names for clients and projects
- ✅ Review activities regularly for security
- ✅ Keep API credentials secure and updated
- ✅ Use the audit log to verify actions completed
- ✅ Backup important reports regularly

### ❌ Don'ts

- ❌ Share your login credentials
- ❌ Delete users/clients without checking dependencies
- ❌ Leave API keys in plain text
- ❌ Ignore security warnings
- ❌ Assume data is synced without checking timestamps
- ❌ Use weak passwords

---

## Glossary

| Term | Definition |
|------|-----------|
| **Campaign** | A marketing or calling initiative (email, voicemail, call) |
| **Client** | An organization or account managed in the platform |
| **SFTP** | Secure File Transfer Protocol (used for DropCowboy) |
| **SMTP** | Simple Mail Transfer Protocol (for email notifications) |
| **API** | Interface for integrating third-party platforms |
| **Sync** | Automatic data refresh from integrated platforms |
| **Role** | Set of permissions defining what a user can do |
| **Dispo** | Disposition (call outcome code in VICIdial) |
| **Ringless Voicemail** | Voicemail delivered without making the phone ring |

---

## Version History

- **v1.0** – January 2026 – Initial user documentation
- **Note:** SMS campaigns report feature is pending development

---

**Last Updated:** January 19, 2026
**Document Version:** 1.0

For the most up-to-date documentation and support, contact your system administrator.
