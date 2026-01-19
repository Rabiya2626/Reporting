# Possible Enhancements and Issues

## Introduction
This document outlines a list of possible enhancements and issues identified across the project, covering areas such as performance, data accuracy, user interface/experience (UI/UX), and functional bugs. Addressing these items will contribute to a more robust, efficient, and user-friendly application.

## Enhancements and Issues List

The following items are listed in order of the original submission:

1. **Performance: Global Fetch Logic Optimization**
   Clients fetching and syncing can be faster by improving global fetch logic across the project.

2. **Database Optimization: Reports Storage**
   Database size can be reduced by optimizing reports storage.

3. **Bug: Activities Page Filtering**
   Action items filtering are not working for "Project," "Project Updated," and "Project Deleted" options in the Activities page.

4. **UI/UX: Add Employee Modal Manager Selection**
   Assigning a manager is optional in "Add Employee" modal, but when a manager is selected, there is no unselecting or cancel option provided to revert the selection.

5. **Bug/Data Inaccuracy: Dashboard Quick Action - Manage Users**
   On the Dashboard's Quick Action section, clicking "Manage Users" should redirect to the employees/users page, but it is currently showing incorrect statistics there.

6. **Data Integrity: Storing and Aggregation**
   Data storing and data aggregation processes are not accurate.

7. **Bug/Data Inaccuracy: Dashboard Stat Cards Redirection**
   On the Dashboard, the manager, team, and admin stat cards are all redirecting to the same `/employees` route, and the statistics displayed are not accurate for the respective roles.

8. **UI/UX: Sync Buttons Placement**
   Sync buttons should be consolidated and only appear on the Settings page for better user experience and control.

9. **Bug: Services.jsx - Autovation - Segments 'created' Column**
   In `Services.jsx > Autovation > Segments`, the 'created' column shows "N/A" instead of any date.

10. **UI/UX: Clients Page Navigation**
    The hierarchical navigation of the clients page can be improved.

11. **Bug/UI: Lowercase Names in Assignment**
    There is an issue with lowercase names appearing in the assigned column and the assignment modal.