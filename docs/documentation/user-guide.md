# Labrador — User Guide

> **Document type:** User documentation (Lecture 13 §3A)
> **Audience:** Lab Owners, Lab Admins, and Lab Users of the Labrador lab
> workflow & request management system
> **Scope:** the web application at `http://localhost:3000` in development

---

## 1. What Labrador is for

Labrador manages the request workflow of a laboratory. Two kinds of records
move through it:

| Record | Meaning | Who creates it |
| --- | --- | --- |
| **Ticket** | A *request* submitted to the lab. Starts `pending`, then becomes `accepted` or `rejected`. | Any member |
| **Task** | *Work* the lab does, assigned to one or more members. Starts `in_progress`, then `completed`. | Any member |

Supporting records: **categories** (what kind of work a ticket or task is),
**announcements** (lab-wide notices), and the **log** (who changed what).

## 2. Roles and what each may do

| Capability | Lab User | Lab Admin | Lab Owner |
| --- | :---: | :---: | :---: |
| Sign in, see dashboard | Yes | Yes | Yes |
| File a ticket | Yes | Yes | Yes |
| See **all** tickets | No — only their own | Yes | Yes |
| See **all** tasks | No — only tasks assigned to them | Yes | Yes |
| Create / edit / delete a category | No | Yes | Yes |
| Post / edit / delete an announcement | No | Yes | Yes |
| View the audit log | No | Yes | Yes |
| Create a member, set quota, deactivate | No | Yes | Yes |
| Change another member's role | No | Yes (not Owners, not self) | Yes |
| Rename **themselves**, change own email/password | Yes | Yes | Yes |

A **trial** member has a *ticket quota* — a number of tickets they may file,
which counts down by one each time. A plain member has no quota at all.
Only a Lab Owner or Lab Admin can set or top up a quota.

> The **Lab Owner** role is granted only from the Supabase dashboard, never
> from inside the app. A Lab Owner cannot be deactivated or deleted in the app.

## 3. Getting an account

There is **no self sign-up**. A Lab Owner or Lab Admin creates the account and
hands over the email and password directly — nothing is emailed, and the
address is confirmed immediately, so you can sign in straight away.

If you need an account, or your credentials do not work, contact your Lab Owner.

## 4. Signing in

1. Open `http://localhost:3000`. Any page you visit without being signed in
   redirects to `/auth`.
2. Enter the email address and password you were given.
3. Press the sign-in button. You land on **Dashboard**.

**If sign-in fails**, the page says the email or password is incorrect and to
contact your Lab Owner to reset your credentials. If your account has been
**deactivated**, the page tells you so — ask a Lab Owner or Lab Admin to turn
it back on. A deactivated account is refused everywhere in the app, not just at
the login screen.

Sign out from the sidebar.

## 5. Moving around

The left **sidebar** expands on hover and holds:

- **Dashboard** — your working overview
- **Request table** — the full list of tickets and tasks
- **Announcement** — lab notices
- **Settings** — opens as a panel over the current page (not a separate page)

Clicking the page you are already on clears the local cache and reloads it —
use that if you suspect you are looking at stale data.

## 6. Dashboard

The dashboard answers "what needs my attention":

- **Announcements** panel — the newest lab notices.
- **View toggle** — switch the panel below between **tasks** and **tickets**.
- **Scope toggle** — **mine** (what you created or are assigned) or the wider
  lab view, where your role allows it.
- **Summary** — counts by status for the current view.
- **Overview** — the list itself. Click any row to open a slide-up panel with
  the full record.
- **Missing** panel — items past their due date; it disappears when there is
  nothing overdue.

## 7. Request table

Two tabs: **Ticket** and **Task**. Each tab keeps its own search, filters and
page position, so switching tabs does not lose your place.

### Finding a record

- **Search** matches the record **name**; typing digits also matches the
  record **id**, so `12` finds ticket 12.
- **Filters**: category, status, due-date range, and for tickets, whether the
  ticket is yours or someone else's.
- **Pagination** at the foot of the table.
- A record can be linked directly: `/request-table/ticket/12` or
  `/request-table/task/12` opens that record's detail. A link to a record that
  no longer exists, or that you may not see, shows a "link error" message.

### Filing a ticket

1. Open the **Ticket** tab → **create**.
2. Fill in:
   - **Name** — required, up to 255 characters.
   - **Description** — optional, up to 1000 characters.
   - **Category** — required; pick from the categories an admin has set up.
   - **Due date** — optional. A due date means *end of that day*, Bangkok time
     (UTC+7).
3. Save. The ticket is created as **pending**.

If you are a trial member and your quota is spent, the save is refused with
**"Ticket quota exhausted"**. Ask an admin to raise your quota.

### Creating a task

Same form, plus **assignees** — the members who will do the work. A task also
requires a **due date**. A task starts **in_progress**.

### Editing and deleting

Open a record and edit it in place; you only need to change the fields you
care about. Every change is written to the log with the old and new value, so
the lab can see who changed what and when. Deleting a record removes it from
the table but leaves its log entries behind.

## 8. Announcements

Everyone can read announcements, newest first. Lab Owners and Lab Admins can
**post**, **edit** and **delete** them. An announcement has a name and an
optional description (up to 1000 characters); URLs in the text become links.

## 9. Settings

Open **Settings** from the sidebar. It has four sections:

| Section | What it does | What a Lab User sees |
| --- | --- | --- |
| **Account** | Your username, email and password | Everything — it is their own account |
| **Category** | Add, rename and remove categories | The category list, read-only |
| **Member** | Create members, set quota, activate/deactivate, change roles, delete | A reduced member list, with no actions except on their own row |
| **Log** | The audit log — table, column, old value, new value, who, when | A notice instead of the log |

All four sections are listed for everyone; the admin-only parts are hidden or
read-only for a Lab User, and the backend refuses them regardless.

### Changing your own details

- **Username** — must be unique, 1–30 characters.
- **Email** — you must re-enter your **current password** to change it. This is
  not an identity check (you are already signed in); it stops someone at an
  unlocked browser pointing your login at their own address.
- **Password** — enter the current one, then the new one. A password must be
  **8–72 characters**. Supabase may still refuse a weak password, and its own
  wording is shown when it does.

### Managing members (admins)

- **Create member** — username, email, password, and the kind: **member**
  (no quota) or **trial** (a ticket quota, 10 by default).
  Everyone is created as a **Lab User**; promoting is a separate, deliberate
  step.
- **Quota** — a number, 0 or more. Blank means unlimited.
- **Deactivate** rather than delete when someone leaves: a member who owns
  tickets, tasks or announcements cannot be deleted, and the app says so.
- You cannot deactivate, delete, or change the role of **your own** account,
  and a **Lab Admin cannot edit another Lab Admin** — only a Lab Owner can.

## 10. Troubleshooting & FAQ

| What you see | What it means | What to do |
| --- | --- | --- |
| Redirected to the login page | Your session expired, or you are not signed in | Sign in again |
| "This account is deactivated…" | An admin turned your account off | Ask a Lab Owner or Lab Admin to reactivate it |
| "Ticket quota exhausted" | You are a trial member with no tickets left | Ask an admin to raise your quota |
| "Only a Lab Owner or Lab Admin can do this" | The action needs admin rights | Ask an admin to do it |
| "Only Lab Owner could change details of other Admin" | A Lab Admin tried to edit another Lab Admin | Ask the Lab Owner |
| Category cannot be deleted | Tickets or tasks still use it | Move those records to another category first, then delete |
| "That username is already taken" / "…email already belongs to…" | The value is in use | Pick another |
| "Lab Owner can only be granted from the Supabase dashboard" | Owner is not grantable in-app | Use the Supabase dashboard |
| A task or ticket link shows a link error | The record is gone, or outside what you may see | Open the request table and search for it |
| The table looks out of date | You are seeing cached data | Click the current page in the sidebar to clear the cache and reload |

**Why is a due date "one day later" than I typed?** It is not. A due date is
stored as the *end* of the day you picked, in Bangkok time (UTC+7). Saving a
record without touching the due date never moves the deadline.
