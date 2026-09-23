---
type: reference
---

# Database inventory

The tables of Supabase project `udnmqhayzhrbltxzzhjw` that this app and the
old app's data layer (`../rux-ui/js/data/*.js`) use. This app is a frontend
replacement: it reads and writes the tables below as they are. Nothing here is
a schema change.

The live project is the contract. When it and this page disagree, read the
live tables through the Supabase connection and fix this page; do not fix
the schema to match the page.

## 1. How the two apps reach the database

- **Both log in as staff.** The site's log-in page and the old app's own screen
  each log in a Supabase Auth user. A user is staff when a `public.profiles` row carries its id in
  `user_id` and the account's `app_metadata` has `owner` true or `scheduler`
  in `apps`. `my_staff_profile()` returns that row with `owner` and `apps`.
  This app's client is the site's `account.js`; the old app's is
  `../rux-ui/js/data/supabase.js`.
- **A third reader is the Claude connector**, an Edge Function rather than a
  page; section 5 covers it.
- **The old app goes through a proxy.** Its client's URL is a Cloudflare
  Worker (`../rux-ui/worker/`), a pass-through to the Supabase host plus one
  route of its own, `/ai/extract`, used only by the intake page. This app
  talks to the Supabase host directly.
- **Every table has row level security, and most still let the publishable
  key in.** Each carries a `staff_all` rule for a staff session beside an open
  one: `dev_all` on `trips`, `buses`, `drivers`, `trip_assignments`,
  `trip_drivers`, `trip_stops`, `trip_pos` and `trip_invoices`; a
  public-select and manage-all pair on `contacts`, `driver_time_off`,
  passengers, tickets, notifications, team chat and dev notes; full access on
  `bus_out_of_service`; and `transition_open` on `settings`,
  `trip_documents`, `trip_itineraries` and `trip_payments`. `profiles` is open
  to read and manage, but neither role can write its `user_id` or
  `sees_all_apps`. The game tables are public to read and to join.
- **Two tables are staff only:** `quote_rates` and `quote_mileage_rates`.
- **Eight tables have no rule at all**, so they are reachable only through
  `security definer` functions: `trip_requests`, `trip_history`,
  `driver_schedule_shares`, `maintenance_schedule_shares`,
  `trip_driver_confirmations`, `trip_driver_statuses`, `trip_buses`,
  `trip_docs`.
- **The publishable key can run 33 of the 44 `security definer` functions.**
  The eleven it cannot are `is_staff`, `assert_staff`, `staff_profile_id`,
  `my_staff_profile`, `signal_maintenance_schedule`, `is_owner`,
  `list_accounts`, `set_account_apps`, `replace_maintenance_schedule_share`,
  `get_trip_driver_statuses` and `sync_trip_driver_statuses`. The last two
  also call `assert_staff`, because an anonymous sign-in is signed in.

**What this means for this app.** A staff session and the publishable key
alone reach the same rows until the open rules come down. That is a cutover
step, taken once nothing uses the key alone, as a migration applied through
the Supabase connection. `platform.profiles` is a separate table that holds a
staff member's name and theme across the site, and in `scheduler_shortcuts`
their choice for slots 2 to 4 of the selected bar's shortcuts, null for the
default set.

## 2. Tables

Column lists are complete, apart from `created_at`, for the six tables the
schedule grid depends on; the rest name the columns that matter to a screen. Enumerations are `check`
constraints, not types; there are no views.

### The grid's six

| Table | Key and links | Columns |
|---|---|---|
| `trips` | `id`; `trip_ref`; `booking_contact_id` and `trip_contact_1..5_id` to `contacts` | 94 columns. Scheduling: `destination`, `customer`, `notes`, `start_date`, `end_date`, `departure_time`, `spot_time`, `return_time`, `return_start_date`, `return_end_date`, `bus_count`, `return_bus_count`, `trip_type` (round_trip, one_way, dropoff_pickup), `vehicle_type` (a `buses.type`, null for any), `trip_bar_color`, `is_self_organized`. Contacts: `booking_contact_name`, `_phone`, `_email`, `_missive_url`; `trip_contact_1..5_name` and `_phone`; `contact_not_needed`. Money: `quoted_price`, `deposit_amount`, `contract_status`, `contract_note`, `po_received`, `po_ref`, `po_amount`, `invoiced`, `invoice_status`, `invoice_number`, `balance_paid`, `date_paid`, `payment_ref_1..3`. Needs: `req_sleeper`, `req_56pax`, `req_ada`, `need_hotel`, `need_fuel_card`, `trip_reqs` jsonb. Distance: `pickup_address`, `est_miles`, `actual_miles`, `driving_hours`, `on_duty_hours`. Per-leg workflow, `_outbound` and `_return`: `driver_contact_sent`, `trip_reminder_sent`, `envelope_printed`, `fuel_card_assigned`, `fuel_card_number`, `hotel_booked`, `hotel_itinerary_number`, `itinerary_printed`, `hos_form_printed`. After the trip: `post_trip_survey_sent`, `post_trip_survey_message`, `post_trip_incident`, `post_trip_note`. Status: `updated_at` (trigger), `confirmed`, `itinerary_confirmed`, `itinerary_not_needed`, `cancelled_at`, `cancellation_reason`. |
| `buses` | `id`; `bus_ref` generated `BUS-###` by trigger | `number`, `capacity`, `type` (Coach, Van), `ada_lift`, `sleeper`, `status` (active, inactive), `make`, `model`, `year`, `vin`, `color`, `mileage`, `last_service`, `next_service`, `insurance_exp`, `registration_exp`, `inspection_exp`, `sort_order`, `notes` |
| `drivers` | `id`; `driver_ref` generated `DRV-###` by trigger | `name`, `short_name`, `phone`, `email`, `texting_url`, `address`, `city`, `address_state`, `zip`, `date_of_birth`, `hire_date`, `employment_type` (full-time, part-time, contract, seasonal), `status`, `priority` (1 to 5), `sort_order`, `cdl_class`, `license_number`, `license_state`, `license_exp`, `med_card_expiry`, `endorsements` text[], `emergency_contact_name`, `emergency_contact_phone`, `photo_path`, `notes` |
| `trip_stops` | `id`; `trip_id` to `trips`, cascade | `position`, `leg` (outbound, return), `type`, `label`, `name`, `address`, `lat`, `lng`, `mapbox_id`, `miles`, `drive`, `miles_source` and `drive_source` (estimated, manual), `depart_prev`, `arrive`, `spot`, `depart_prev_date`, `arrive_date`, `spot_date`, `dwell_status` (off, sleeper, on), `route_status` |
| `trip_assignments` | `id`; `trip_id` to `trips` cascade; `bus_id` to `buses` set null | `position`, `leg` (outbound, return), `active_roles` text[] |
| `trip_drivers` | `id`; `assignment_id` to `trip_assignments` cascade; `driver_id` to `drivers` set null | `role`, `pay`, `report_time`, `instructions`, `trip_reminder_sent`, `envelope_printed` |

A trip's place on the grid is `trips` for the dates and times,
`trip_assignments` for which bus row and which leg, `trip_drivers` for the
names on the bar. `bus_out_of_service` (`bus_id`, `start_date`, `end_date`,
`reason`) paints the out-of-service stripe; `driver_time_off` (`driver_id`,
`start_date`, `end_date`, `reason`, `notes`, `position`) feeds availability.

### The rest

| Table | Used by | Notes |
|---|---|---|
| `contacts` | trip editor, Customers view | `name`, `phone`, `email`, `client` |
| `trip_payments` | trip editor Billing tab | `trip_id`, `position`, `amount`, `method`, `date`, `ref`. Old app rewrites all rows on save. |
| `trip_pos` | trip editor Billing tab | `trip_id` to `trips`, cascade; `position`, `ref`, `amount`, `date` |
| `trip_invoices` | trip editor Billing tab | `trip_id` to `trips`, cascade; `position`, `number`, `amount`, `date` |
| `trip_quote_lines` | trip editor Billing tab, customer quote | `trip_id` to `trips`, cascade; `position`, `kind` (rental, second_driver, discount, other), `leg` (outbound, return or null), `item`, `description`, `quantity`, `cost`, `amount`, `cost_typed`, and a rental line's `miles`, `dead_miles` and `rate`. Staff only, broadcast on realtime. |
| `trip_ticket_options` | trip editor, manifest | `trip_id`, `position`, `label`, `price` |
| `trip_passengers` | manifest | 17 columns: `name`, `phone`, `email`, `seat`, `status`, `ticket_option_id`, `amount_owed`, `amount_paid`, `group_label`, `pickup_location` |
| `trip_passenger_payments` | manifest | `passenger_id`, `amount`, `method`, `date`, `ref` |
| `trip_documents` | trip editor Files, driver page, `../rux-ui/doc.html` | `trip_id`, `label`, `file_name`, `file_path`, `file_size`. Files in bucket `trip-documents`. |
| `trip_itineraries` | Itineraries view | `trip_id` (unique when set), `document` jsonb, `status` (new, reviewed, closed), `label` |
| `trip_requests` | Requests view, `../rux-ui/request.html` | `reference` (`REQ-` plus six), `status`, `source`, `contact` jsonb, `payload` jsonb, `trip_id`. RPC only. |
| `trip_history` | History tab | `trip_id`, `trip_ref`, `action` (nine values), `changes` jsonb, `metadata` jsonb. RPC only. |
| `trip_driver_statuses` | driver page, Tasks | `trip_id`, `driver_id`, `leg`, `role`, `status` (five values), `source` (dispatcher, driver), `accepted_at`, `declined_at`. RPC only. |
| `trip_driver_confirmations` | legacy | superseded by `trip_driver_statuses`; still written by the confirm and decline RPCs |
| `driver_schedule_shares` | driver editor, `../rux-ui/driver.html` | `token`, `driver_id`, `trip_legs` jsonb, `range_start`, `range_end`, `expires_at`, `revoked_at`. RPC only. |
| `trip_drafts` | Claude connector, trip editor `?draft=` | `author` to `auth.users`, cascade; `trip_id` to `trips`, cascade and null for a new trip; `fields` jsonb, `notes`, `expires_at`. Only the author reads it, only while staff, only before it expires; a nightly job deletes the rest. |
| `maintenance_schedule_shares` | this app's maintenance pages, `../rux-ui/maintenance.html` | one row, `scope = 'main'`, `token`, `revoked_at`. RPC only. |
| `settings` | Settings view | key-value, `value` jsonb. Yard, locations, requirements and billing defaults live here. |
| `profiles` | both apps' staff log-in, the old app's profile | `display_name`, `photo_path`, `settings` jsonb, `avatar_color`; `user_id`, the Auth user this staff member logs in as; `sees_all_apps`, which no code reads; the owner switch in `app_metadata` decides instead. Not `platform.profiles`. |
| `notifications`, `notification_reads` | header bell | `type` (three values), `severity`, `title`, `ref_table`, `ref_id`, `dedupe_key` unique |
| `team_messages`, `team_message_reactions`, `team_chat_reads` | team chat | dropped from this app, see the screen inventory |
| `dev_notes` | dev notes popover | dropped |
| `game_*` (four tables, nine functions) | Flip Seven | dropped |
| `trip_docs`, `trip_buses` | nothing | referenced by no code; leave alone |
| `quote_rates` | quote calculator | this app's own. `key` and `value`, one row per named rate; the keys are listed in `scheduler/quote.js`. Staff only. |
| `quote_mileage_rates` | quote calculator | this app's own. `rate`, `note`, `is_default` (at most one true). Staff only. |

### Functions the app calls

Trigger functions `set_bus_ref`, `set_driver_ref`, `touch_trips_updated_at`,
`trip_itineraries_touch` run on their own. The RPCs a screen calls:

| Area | Functions |
|---|---|
| Driver share links | `create_driver_schedule_share`, `update_driver_schedule_share`, `get_driver_schedule_share`, `get_driver_schedule_share_for_driver`, `revoke_driver_schedule_share` |
| Driver acceptance | `confirm_trip_assignment`, `decline_trip_assignment`, `get_trip_driver_statuses`, `sync_trip_driver_statuses`, `get_driver_assignment_statuses`, `get_driver_confirmations` |
| Maintenance link | `create_maintenance_schedule_share`, `get_maintenance_schedule_share`, `get_maintenance_schedule`, `get_maintenance_schedule_changes`, `revoke_maintenance_schedule_share`; `replace_maintenance_schedule_share`, staff only, gives the link a new token or makes the first one |
| Trip requests | `create_trip_request`, `submit_trip_request`, `get_trip_request`, `list_trip_requests`, `update_trip_request_status`, `link_trip_request`, `delete_trip_request`, `new_trip_request_reference` |
| Document links | `get_trip_document`, for this app's and rux-ui's document link pages |
| History | `record_trip_history`, `get_trip_history` |
| Access, owner only, on the Account page | `is_owner`, `list_accounts`, `set_account_apps`; not callable without a log-in |

### Storage buckets

`trip-documents` (paths under the trip id), `driver-photos` and
`profile-photos`. All three are public, with no size or file-type limit, and
the publishable key can upload to and delete from each.

### Realtime

The old app subscribes to `postgres_changes` on `trips`, `trip_stops`,
`trip_assignments`, `trip_documents`, `trip_payments`, `trip_pos`,
`trip_invoices`, `trip_passengers` and `trip_ticket_options` for the grid,
and separately on notifications, team chat, dev notes and the game. A
30-second poll backs the grid up, and is the only thing that picks up
`trip_drivers`. This app does not subscribe.

## 3. Table to screen

Which screen of this app reads and writes each table. Screens are named
as in `screen-inventory.md`.

| Table | Read by | Written by |
|---|---|---|
| `trips` | Schedule, Trips search, driver page | Trip editor; a save that changes billing also writes `confirmed`, `balance_paid` and `date_paid`, derived as rux-ui derives them |
| `trip_assignments` (with `active_roles`), `trip_drivers` | Schedule, Drivers, Fleet | Trip editor's Fleet tab, which updates, inserts and deletes rows by id and never writes `trip_drivers.pay`; the bus reassignment drag writes `trip_assignments.bus_id` alone, or inserts the row when the bar is an empty slot |
| `trip_stops` | Schedule, Trip editor Route tab, driver page | Trip editor Route tab: a leg's pickup, drop-off and return rows, added when missing |
| `buses`, `bus_out_of_service` | Schedule, Fleet, `../rux-ui/maintenance.html` | Fleet editor |
| `drivers`, `driver_time_off` | Schedule, Drivers | Driver editor |
| `contacts` | Trip editor, Customers | Customer editor, trip editor |
| `trip_payments`, `trip_pos`, `trip_invoices`, `trip_ticket_options` | Trip editor Billing | Trip editor |
| `trip_quote_lines` | Trip editor Billing, the customer quote on the Forms page | Trip editor, which writes `quoted_price` as the lines' sum |
| `trip_passengers`, `trip_passenger_payments` | Manifest | Manifest |
| `trip_documents` + bucket | Trip editor Files, driver page, `../rux-ui/doc.html` | Trip editor Files and the bar menu's Upload itinerary, each change with a `trip_history` entry |
| `trip_requests` (RPC) | Requests, `../rux-ui/request.html` | `../rux-ui/request.html` submits; Requests changes status and links |
| `trip_history` (RPC) | History | every save in the trip editor |
| `trip_driver_statuses` (RPC) | Schedule, Tasks, Drivers | driver page accepts and declines; the bar menu's driver status items |
| `driver_schedule_shares` (RPC) | Driver editor | Driver editor |
| `settings` | Settings, trip editor defaults, the Billing tab's `billing-workflow-v1`, the Route tab's `yard-location-v1` and `mapbox-token-v1` | Settings |
| `notifications`, `notification_reads` | header bell | old app's notification job; unchanged |
| `trip_itineraries` | Itineraries, deferred | intake, deferred |

## 4. What the old app names that the project lacks

`../rux-ui/js/data/trip-request-db.js` calls `attach_trip_request_document`
and `list_trip_request_documents` and uploads to a `trip-request-uploads`
bucket. None of the three exists in the live project, and neither does a
`trip_request_documents` table.

## 5. The Claude connector

`scheduler-connector`, the project's one Edge Function, source in
`scheduler/connector/index.ts`. It serves MCP at
`/functions/v1/scheduler-connector`, which the Claude app speaks to a custom
connector, and it is deployed with Verify JWT off because it carries its own
check: `withOAuthProtectedResource` and `withSupabase({ auth: 'user' })` from
Supabase's middleware refuse a request with no token and answer the
unauthenticated one with the header that starts the sign-in. Every query runs
on the caller's own session, so the same rules apply to it as to a page.

Sign-in is Supabase's OAuth 2.1 server, whose consent screen is the site's
own page at `/oauth/consent/`; Supabase hosts none.

**Six tools read**, each on the tables above: `find_trips` and `get_trip` on
`trips` with its assignments, drivers and stops; `find_availability`, which
reads the trips running across a range and subtracts their buses and drivers,
then `bus_out_of_service` and `driver_time_off`; `find_contacts`,
`list_buses` and `list_drivers`.

The fields a draft may fill are mostly `trips` columns, but the route's four
are the Route tab's own names, because the tab writes `trip_stops` rather than
columns: `pickup_location`, `pickup_address`, `dropoff_location` and
`dropoff_address`.

**Two tools write, and neither writes a trip.** `draft_trip` and
`draft_trip_change` put a row in `trip_drafts` and return
`/scheduler/?draft=<id>`. A draft may fill only the trip fields the function
lists, so it can carry nothing the editor has no way to show; `data.js` maps
each of those to the control it is typed into, and names in the panel's notice
any it cannot place. The editor's Save stays the only writer of a trip.

`scheduler/docs/working-from-claude.md` is how to use it.
