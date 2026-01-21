# 🧭 Possible Enhancements and Issues

## Introduction
This document outlines detailed enhancements and issues identified across the project, categorized by functionality, performance, data accuracy, and user experience (UI/UX). Each section includes the description, impact, affected modules, and suggested next steps to aid prioritization and resolution.

---

## 📋 Summary Overview

| ID | Title | Type | Impact | Status |
|----|--------|------|---------|---------|
| 1 | Global Fetch Logic Optimization | Performance / Enhancement | 🟧 Medium | ⏳ Pending Review |
| 2 | Database Optimization: Reports Storage | Database / Enhancement | 🟥 High | ⏳ Pending Review |
| 3 | Activities Page Filtering | Bug / Functional | 🟩 Low | ⏳ Pending Review |
| 4 | Add Employee Modal – Manager Selection | UI/UX / Enhancement | 🟩 Low | ⏳ Pending Review |
| 5 | Data Storing and Aggregation Accuracy | Data Accuracy / Backend | 🟥 High | ⏳ Pending Review |
| 6 | Dashboard Stat Cards Redirection | Bug / Data Inaccuracy / UI | 🟧 Medium | ⏳ Pending Review |
| 7 | Sync Buttons Placement | UI/UX / Enhancement | 🟩 Low | ⏳ Pending Review |
| 8 | Services.jsx – Autovation ‘Created’ Column | Bug / Data Display | 🟩 Low | ⏳ Pending Review |
| 9 | Clients Page Navigation | UI/UX / Enhancement | 🟧 Medium | ⏳ Pending Review |
| 10 | Lowercase Names in Assignment | Bug / UI | 🟩 Low | ⏳ Pending Review |
| 11 | Total Campaign Cost Visibility for Full Access Roles | Bug / Permission / Data Accuracy | 🟥 High | ⏳ Pending Review |
| 12 | Access Restriction for Services.jsx Page | Bug / Permission | 🟥 High | ⏳ Pending Review |

---

## 🧩 Detailed List

### **1. Global Fetch Logic Optimization**
**Type:** Performance / Enhancement  
**Impact:** 🟧 Medium  
**Status:** ⏳ Pending Review  

**Description:**  
Fetching and syncing clients globally across the project is slower than expected. Multiple API calls and redundant state updates increase response time, especially on larger datasets.  

**Steps to Reproduce / Current Behavior:**  
When switching between clients or triggering sync operations, noticeable delays occur due to repeated fetches without caching or centralized handling.  

**Expected Behavior / Proposed Solution:**  
Implement a centralized data fetching strategy (e.g., caching, React Query, or global state optimization) to reduce redundant API calls and improve responsiveness.  

**Affected Modules:**  
- Any component using global fetch logic  

**Dependencies:**  
API endpoints for client data retrieval  

---

### **2. Database Optimization: Reports Storage**
**Type:** Enhancement / Database / Performance  
**Impact:** 🟥 High  
**Status:** ⏳ Pending Review  

**Description:**  
Reports are consuming excessive database space due to unoptimized storage formats or redundant entries.  

**Current Behavior:**  
Full report objects are being stored in the database without optimization, leading to inflated database size.  

**Expected Behavior / Proposed Solution:**  
Optimize report storage by normalizing tables, introducing cleanup jobs, or compressing archived data. Consider adding retention policies.  

**Affected Modules:**  
- Database (Reports Table)  
- API layer for report CRUD operations  

**Dependencies:**  
Backend storage schema, data migration scripts  

---

### **3. Activities Page Filtering**
**Type:** Bug / Functional  
**Impact:** 🟩 Low  
**Status:** ⏳ Pending Review  

**Description:**  
Filtering of action items on the Activities page is not working as expected for the options “Project Created,” “Project Updated,” “Project Deleted,” and “Status Changed.”  

**Steps to Reproduce:**  
1. Navigate to Activities page.  
2. Apply filters for the above options.  
3. No change in the displayed results.  

**Expected Behavior:**  
Filters should dynamically update the activity list according to the selected event type.  

**Affected Modules:**  
- `Activities.jsx`  

**Dependencies:**  
Filter logic and backend API for fetching filtered activities  

---

### **4. Add Employee Modal – Manager Selection**
**Type:** UI/UX / Enhancement  
**Impact:** 🟩 Low  
**Status:** ⏳ Pending Review  

**Description:**  
In the “Add Employee” modal, manager selection is optional but lacks a way to clear or revert the selection once made.  

**Steps to Reproduce:**  
Select a manager, then try to remove or unselect them — there’s no option available.  

**Expected Behavior:**  
Provide a clear “X” or “Clear Selection” option to remove a selected manager before submitting.  

**Affected Modules:**  
- `Employees.jsx`  

---

### **5. Data Storing and Aggregation Accuracy**
**Type:** Data Accuracy / Backend  
**Impact:** 🟥 High  
**Status:** ⏳ Pending Review  

**Description:**  
Inconsistent or inaccurate data aggregation during storing and summarizing operations.  

**Current Behavior:**  
Aggregated stats (e.g., totals per client or campaign) don’t always match individual record data.  

**Expected Behavior / Proposed Solution:**  
Verify and fix aggregation logic to ensure data consistency. Introduce validation and reconciliation jobs.  

**Affected Modules:**  
- API aggregation endpoints  
- Database layer  

**Dependencies:**  
All reporting and analytics features  

---

### **6. Dashboard Stat Cards Redirection**
**Type:** Bug / Data Inaccuracy / UI  
**Impact:** 🟧 Medium  
**Status:** ⏳ Pending Review  

**Description:**  
The Manager, Team, and Admin stat cards on the Dashboard redirect to the same `/employees` route and display incorrect statistics.  

**Steps to Reproduce:**  
Click on each stat card → Same page and incorrect numbers.  

**Expected Behavior:**  
Each card should redirect to its respective filtered employee list and display accurate role-based counts.  

**Affected Modules:**  
- `Dashboard.jsx`  
- `HierarchyPage.jsx`  

**Dependencies:**  
Backend role-based statistics API  

---

### **7. Sync Buttons Placement**
**Type:** UI/UX / Enhancement  
**Impact:** 🟩 Low  
**Status:** ⏳ Pending Review  

**Description:**  
Sync buttons are scattered across different pages, causing clutter and inconsistent user experience.  

**Expected Behavior / Proposed Solution:**  
Move all sync-related buttons to the Settings page, under a dedicated “Data Sync” section.  

**Affected Modules:**  
- `Dashboard.jsx`  
- `Settings.jsx`  
- `Clients.jsx`  
- `Services.jsx`

---

### **8. Services.jsx – Autovation ‘Created’ Column**
**Type:** Bug / Data Display  
**Impact:** 🟩 Low  
**Status:** ⏳ Pending Review  

**Description:**  
In `Services.jsx > Autovation > Segments`, the “created” column shows “N/A” for all records instead of creation dates.  

**Steps to Reproduce:**  
Open Autovation Segments → Observe “N/A” in the created column.  

**Expected Behavior:**  
Display formatted creation date fetched from the database.  

**Affected Modules:**  
- `SegmentsSection.jsx`  
- API endpoint for Autovation Segments  

---

### **9. Clients Page Navigation**
**Type:** UI/UX / Enhancement  
**Impact:** 🟧 Medium  
**Status:** ⏳ Pending Review  

**Description:**  
The hierarchical navigation within the Clients page might feel unintuitive when moving between clients and campaigns.  

**Expected Behavior / Proposed Solution:**  
Improve navigation using breadcrumb trails or collapsible tree views to clarify hierarchy.  

**Affected Modules:**  
- `Clients.jsx`  
- `ClientServicesSection.jsx`  
- `MauticCampaignsSection.jsx`  
- `MauticEmailsSection.jsx`  
- `ClientsDropCowboyDashboard.jsx`  

---

### **10. Lowercase Names in Assignment**
**Type:** Bug / UI  
**Impact:** 🟩 Low  
**Status:** ⏳ Pending Review  

**Description:**  
Assigned employee names appear in lowercase in both the Assigned column and the assignment modal.  

**Steps to Reproduce:**  
Assign an employee → Observe lowercase display in relevant components.  

**Expected Behavior:**  
Names should display with proper capitalization (e.g., “John Doe” instead of “john doe”).  

**Affected Modules:**  
- `Clients.jsx`

---

### **11. Total Campaign Cost Visibility for Full Access Roles**
**Type:** Bug / Permission / Data Accuracy  
**Impact:** 🟥 High  
**Status:** ⏳ Pending Review  

**Description:**  
Users with roles marked as “Full System Access” cannot view Total Campaign Cost for Ringless Voicemail clients, even though they should.  
Visibility is currently hardcoded to `"superadmin"` only.  

**Expected Behavior / Proposed Solution:**  
Update logic to include all roles with `"fullAccess": true"` in the permission check.  

**Affected Modules:**  
- `RecordsTable.jsx`  
- `MetricsCards.jsx`  
- Role-based access logic  

**Dependencies:**  
User role definitions and permissions system  

---

### **12. Access Restriction for Services.jsx Page**
**Type:** Bug / Permission  
**Impact:** 🟥 High  
**Status:** ⏳ Pending Review  

**Description:**  
In the `Services.jsx` page, users with any role can currently view all clients and campaigns — even when no clients are assigned to them.  
This page does not follow the same access restrictions as `Clients.jsx`, where users only see their assigned clients (unless they have Full System Access).  

**Steps to Reproduce:**  
1. Login with a non-admin user who has limited access.  
2. Open the Services page.  
3. Observe that all clients and campaigns are visible.  

**Expected Behavior:**  
Restrict visibility so that:  
- Regular users can view only the clients and campaigns assigned to them.  
- Users with `"fullAccess": true"` can view all.  

**Affected Modules:**  
- `Services.jsx`

**Dependencies:**  
User role permissions and assigned clients mapping  

---
