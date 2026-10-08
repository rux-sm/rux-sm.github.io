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
  page; section 4 covers it.
- **The old app goes through a proxy.** Its client's URL is a Cloudflare
  Worker (`../rux-ui/worker/`), a pass-through to the Supabase host plus one
  route of its own, `/ai/extract`, used only by the intake page. This app
  talks to the Supabase host directly.
- **Every table has row level security, and the publishable key reaches
  none.** `anon` holds no table grant. The scheduler's tables carry a
  `staff_all` rule for a staff session; `profiles` lets staff read and each
  person update their own row, but never its `user_id`;
  `quote_rates` and `quote_mileage_rates` are staff only too.
- **Eight tables have no rule at all**, so they are reachable only through
  `security definer` functions: `trip_history`, `record_history`,
  `driver_schedule_shares`, `maintenance_schedule_shares`,
  `trip_driver_confirmations`, `trip_driver_statuses`, `trip_buses`,
  `trip_docs`.
- **The publishable key can run ten functions, the ones the link pages
  call:** the driver page's `get_driver_schedule_share`,
  `get_driver_share_trips`, `get_driver_assignment_statuses`,
  `get_driver_confirmations`, `get_driver_accepted_views`,
  `record_driver_accepted_view`, `confirm_trip_assignment` and
  `decline_trip_assignment`; and the maintenance page's
  `get_maintenance_schedule` and `get_maintenance_schedule_changes`. Each takes
  the link's token. Every other function of the scheduler's is closed to the
  key, and the ones a staff page calls check `is_staff` first, so an account
  signed in without the Scheduler is refused too. The key can also run
  Pixels' eight, which `pixels/README.md` lists; each takes a guest's key.

`platform.profiles` is a separate table that holds a staff member's name and
theme across the site. Its `scheduler_shortcuts` column held a choice of
shortcuts the scheduler no longer offers, and nothing reads it.

## 2. Tables

Column lists are complete, apart from `created_at`, for the six tables the
schedule grid depends on; the rest name the columns that matter to a screen. Enumerations are `check`
constraints, not types; there are no views.

### The grid's six

| Table | Key and links | Columns |
|---|---|---|
| `trips` | `id`; `trip_ref` the estimate number, six digits from 100001 off `trip_ref_seq`, unique, set by trigger on the first save and never changed; `booking_contact_id` and `trip_contact_1..5_id` to `contacts` | 104 columns. Scheduling: `destination`, `customer`, `passengers` (the headcount the customer gave, a whole number or null, which only the scheduler writes; the named list is `trip_passengers`), `notes`, which only rux-ui still writes and the trigger `trips_pin_note` turns into the trip's pinned update, `notes_updated_at` (set by trigger whenever `notes` changes), `start_date`, `end_date`, `departure_time`, `spot_time`, `return_time`, `return_start_date`, `return_end_date`, `bus_count`, `return_bus_count`, `trip_type` (round_trip, one_way, dropoff_pickup), `vehicle_type` (a `buses.type`, null for any), `trip_bar_color`, `is_self_organized`. Contacts: `booking_contact_name`, `_phone`, `_email`, `_missive_url`; `trip_contact_1..5_name` and `_phone`; `contact_not_needed`. Money: `quoted_price`, `quote_sent_price` and `quote_sent_on` (the price the customer was sent and the day, null until the Billing tab marks it), `deposit_amount`, `contract_status`, `contract_note`, `po_received`, `po_ref`, `po_amount`, `invoiced`, `invoice_status`, `invoice_number`, `balance_paid`, `date_paid`, `payment_ref_1..3`. Needs: `req_sleeper`, `req_56pax`, `req_ada`, `need_hotel`, `need_fuel_card`, `trip_reqs` jsonb. Distance: `pickup_address`, `est_miles` (rux-ui's override of the route's miles, and the only miles its driver records read; the scheduler writes the route's total into it unless a figure is typed), `actual_miles`, `driving_hours`, `on_duty_hours`. Per-leg workflow, `_outbound` and `_return`: `driver_contact_sent`, `trip_reminder_sent`, `envelope_printed`, `fuel_card_assigned`, `fuel_card_number`, `hotel_booked`, `hotel_itinerary_number`, `itinerary_printed`, `hos_form_printed`. After the trip: `post_trip_survey_sent`, `post_trip_survey_message`, `post_trip_incident`, `post_trip_note`. Status: `updated_at` (trigger), `confirmed`, `itinerary_confirmed`, `itinerary_not_needed`, `cancelled_at`, `cancellation_reason`. Done: `route_done_at`, `buses_done_at`, `billing_done_at` and each `_by` (a name), cleared by trigger when the tab's contents change. |
| `buses` | `id`; `bus_ref` generated `BUS-###` by trigger | `number`, `capacity`, `type` (a name from `vehicle-types-v1`, free text), `ada_lift`, `sleeper`, `equipment` jsonb (every other `requirements-v1` vehicle entry it has, `{id: true}`), `status` (active, inactive), `make`, `model`, `year`, `vin`, `color`, `mileage`, `last_service`, `next_service`, `insurance_exp`, `registration_exp`, `inspection_exp`, `sort_order`, `notes` |
| `drivers` | `id`; `driver_ref` generated `DRV-###` by trigger | `name`, `short_name`, `phone`, `email`, `texting_url`, `address`, `city`, `address_state`, `zip`, `date_of_birth`, `hire_date`, `employment_type` (full-time, part-time, contract, seasonal), `status`, `priority` (1 to 5), `sort_order`, `cdl_class`, `license_number`, `license_state`, `license_exp`, `med_card_expiry`, `endorsements` text[], `emergency_contact_name`, `emergency_contact_phone`, `photo_path`, `notes` |
| `trip_stops` | `id`; `trip_id` to `trips`, cascade | `position`, `leg` (outbound, return), `type`, `label`, `name`, `address`, `lat`, `lng`, `mapbox_id`, `miles`, `drive`, `miles_source` and `drive_source` (estimated, manual), `depart_prev`, `arrive`, `spot`, `depart_prev_date`, `arrive_date`, `spot_date`, `dwell_status` (off, sleeper, on), `route_status` |
| `trip_assignments` | `id`; `trip_id` to `trips` cascade; `bus_id` to `buses` set null | `position`, `leg` (outbound, return), `active_roles` text[], `needs` jsonb (the `requirements-v1` entries this vehicle must have, `{id: true}`), `vehicle_type` (a `buses.type`, null for any), `fuel_card_number`, the card that rides with this bus, typed on its first driver's envelope |
| `trip_drivers` | `id`; `assignment_id` to `trip_assignments` cascade; `driver_id` to `drivers` set null | `role`, `pay`, `report_time`, `instructions`, and the driver's four steps, `envelope_printed`, `trip_reminder_sent`, `itinerary_printed` and `hos_form_printed`, each with `_at` and `_by`, which `trip_drivers_stamp_steps` sets as a step is turned on and clears as it is turned off; a seat given another driver has all four turned off |

A trip's place on the grid is `trips` for the dates and times,
`trip_assignments` for which bus row and which leg, `trip_drivers` for the
names on the bar. `bus_out_of_service` (`bus_id`, `start_date`, `end_date`,
`reason`) paints the out-of-service stripe; `driver_time_off` (`driver_id`,
`start_date`, `end_date`, `reason`, `notes`, `position`) feeds availability.

### The rest

| Table | Used by | Notes |
|---|---|---|
| `contacts` | trip editor, Customers view | `name`, `phone`, `email`, `client`, `customer_id` to `customers`. A save in either app gives the booking contact the trip's customer when they have none and carry no other organization. |
| `customers` | trip editor Customer field, Customers and Locations pages | `name`, `usual_location_id` to `locations`, `bill_to`. A save in either app links the trip, by `customer_id`, to the customer its Customer field names, and makes one for a name typed new. |
| `trip_payments` | trip editor Billing tab | `trip_id`, `position`, `amount`, `method`, `date`, `ref`. Both apps write it row by row by id. |
| `trip_pos` | trip editor Billing tab | `trip_id` to `trips`, cascade; `position`, `ref`, `amount`, `date` |
| `trip_invoices` | trip editor Billing tab | `trip_id` to `trips`, cascade; `position`, `number`, `amount`, `date` |
| `trip_quote_lines` | trip editor Billing tab, customer quote | `trip_id` to `trips`, cascade; `position`, `kind` (rental, second_driver, relief, discount, hotel, other), `leg` (outbound, return or null), `item`, `description`, `quantity`, `cost`, `amount`, `cost_typed`, and a rental line's `miles`, `dead_miles` and `rate`. Staff only, broadcast on realtime. |
| `trip_updates` | the board, embedded in each trip for the bar's Updates mark and card; the Updates window, which every Save opens and the Update shortcut opens on its own, and which adds, edits and deletes them | `trip_id` to `trips`, cascade; `created_at`, `actor_id` (default `auth.uid()`), `actor_name`, `body`, `kind` (update, nothing, imported), `changes` jsonb, `edited_at` (null until its words are changed), `pinned_at` (null unless it is the trip's pinned update; a unique index allows one per trip, and the trigger `trip_updates_unpin_others` lets the old pin go when another is pinned). The `imported` rows are copied from `notes`: 217 from its dated lines, credited to Sergio, and each trip's whole note as its pinned update, unless an update already said the same words, which is pinned instead. What was said to the customer, newest first. rux-ui's trip editor lists them on its Details tab, adds one there, and asks for one on every Save as this app does, and either app's cancel writes its reason as one. Staff only, anon granted nothing, broadcast on realtime. |
| `trip_ticket_options` | trip editor, manifest | `trip_id`, `position`, `label`, `price` |
| `trip_passengers` | manifest | 17 columns: `name`, `phone`, `email`, `seat`, `status`, `ticket_option_id`, `amount_owed`, `amount_paid`, `group_label`, `pickup_location` |
| `trip_passenger_payments` | manifest | `passenger_id`, `amount`, `method`, `date`, `ref` |
| `trip_documents` | trip editor Files, driver page, `../rux-ui/doc.html` | `trip_id`, `label`, `file_name`, `file_path`, `file_size`. Files in bucket `trip-documents`. Replacing a file points the same row at the new one in both apps, so a document link keeps working. |
| `trip_itineraries` | Itineraries view | `trip_id` (unique when set), `document` jsonb, `status` (new, reviewed, closed), `label` |
| `trip_history` | History page, rux-ui's History tab | `trip_id`, `trip_ref`, `action` (ten values), `changes` jsonb, `metadata` jsonb, `actor_name`, the name the browser sends, and `actor_id`, the signed-in account, which is empty on a driver's entry, made from a link with no log-in. RPC only. |
| `record_history` | History page | `kind` (driver, bus, customer, contact, location), `record_id`, `record_name`, `actor_id`, `actor_name`, `action` (created, updated, deleted), `changes` jsonb, one `field`, `before` and `after` per column that changed. Written only by the `*_history` triggers on those five tables and on `driver_time_off` and `bus_out_of_service`, whichever app made the change; a trigger that fails warns and never stops the save. RPC only. |
| `trip_driver_statuses` | driver page, Tasks | `trip_id`, `driver_id`, `leg`, `role`, `status` (five values), `source` (dispatcher, driver), `accepted_at`, `declined_at`, and `accepted_view`, what the driver page showed of the driver's job when they accepted, which a later change is compared with. RPC only. |
| `trip_driver_confirmations` | legacy | superseded by `trip_driver_statuses`; still written by the confirm and decline RPCs |
| `driver_schedule_shares` | driver editor, `../rux-ui/driver.html` | `token`, `driver_id`, `trip_legs` jsonb, `range_start`, `range_end`, `expires_at`, `revoked_at`. RPC only. |
| `trip_drafts` | Claude connector, trip editor `?draft=` | `author` to `auth.users`, cascade; `trip_id` to `trips`, cascade and null for a new trip; `fields` jsonb, `notes`, `expires_at`. Only the author reads it, only while staff, only before it expires; a nightly job deletes the rest. |
| `to_dos` | the header's To do panel on every page, which reads the open rows and the ones closed today, adds, edits, ticks and deletes them | `body`; `source` (person, agent); `created_by`, `session_of`, `owner_id` and `closed_by` to `profiles`, set null; `due_on`; `trip_id` to `trips`, cascade; `thread_url`, `thread_key`, one open row per key; `closed_at`, `closed_reason`. Staff only, broadcast on realtime. `to_dos_stamp` sets who made a row and who closed it, an agent row as Ruxbot with the signed-in person in `session_of`, and refuses an agent's close on a row a person wrote. |
| `trip_prep` | the Departures panel, and the Contact list, which marks it after Driver info on a yes and takes it back | one row a trip, `trip_id` to `trips`, cascade; `driver_info_sent` with `driver_info_sent_at` and `_by`, which `trip_prep_stamp` sets. Kept off `trips` so marking it does not move `updated_at` under an open editor. Staff only, broadcast on realtime. |
| `maintenance_schedule_shares` | this app's maintenance pages, `../rux-ui/maintenance.html` | one row, `scope = 'main'`, `token`, `revoked_at`. RPC only. |
| `settings` | Settings view | key-value, `value` jsonb. Yard, locations, requirements, billing defaults and `vehicle-types-v1`, the office's vehicle types as `{ name, label?, icon }`, live here. |
| `profiles` | both apps' staff log-in, the old app's profile | `display_name`, `photo_path`, `settings` jsonb, `avatar_color`; `user_id`, the Auth user this staff member logs in as; which apps an account opens is in its `app_metadata`. Ruxbot is the one row with no `user_id`, the profile an agent's to-do rows are made by, whose id `ruxbot_profile_id()` returns. Not `platform.profiles`. |
| `notifications`, `notification_reads` | header bell | `type` (three values), `severity`, `title`, `ref_table`, `ref_id`, `dedupe_key` unique |
| `team_messages`, `team_message_reactions`, `team_chat_reads` | team chat | dropped from this app, see the screen inventory |
| `dev_notes` | dev notes popover | dropped |
| `game_*` (four tables, nine functions) | Flip Seven | dropped |
| `trip_docs`, `trip_buses` | nothing | referenced by no code; leave alone |
| `quote_rates` | quote calculator | this app's own. `key` and `value`, one row per named rate or rule; the keys are listed in `scheduler/quote.js`, and a rule not yet saved falls back to the spreadsheet's figure there. Staff only. |
| `quote_mileage_rates` | quote calculator | this app's own. `rate`, `note`, `is_default` (at most one true). Staff only. |

### Functions the app calls

Trigger functions `set_bus_ref`, `set_driver_ref`, `set_trip_ref`, `touch_trips_updated_at`,
`touch_updated_at` and `trip_itineraries_touch` run on their own, and so do
`trips_clear_done` and `trip_rows_clear_done`, which take a tab's Done off
`trips` when its dates, bus counts, needs or price change, or its stops,
buses or quote lines do. `to_dos_record_history` writes a tick on a to-do
row with a trip, and its Undo, into `trip_history` as an Updated entry with
one To do line. The RPCs a screen calls:

| Area | Functions |
|---|---|
| Driver share links | `create_driver_schedule_share`, `update_driver_schedule_share`, `get_driver_schedule_share`, `get_driver_schedule_share_for_driver`, `revoke_driver_schedule_share` |
| Driver acceptance | `confirm_trip_assignment`, `decline_trip_assignment`, `get_trip_driver_statuses`, `sync_trip_driver_statuses`, `get_driver_assignment_statuses`, `get_driver_confirmations`, `record_driver_accepted_view`, `get_driver_accepted_views` |
| Maintenance link | `create_maintenance_schedule_share`, `get_maintenance_schedule_share`, `get_maintenance_schedule`, `get_maintenance_schedule_changes`, `revoke_maintenance_schedule_share`; `replace_maintenance_schedule_share`, staff only, gives the link a new token or makes the first one |
| Document links | the `trip-document-link` Edge Function (§5), for this app's and rux-ui's document link pages; `get_trip_document` is staff only and nothing calls it |
| History | `record_trip_history`, which both apps write trip entries through; `search_history` and `history_people`, the History page's read of trip and record entries together and its names; `get_trip_history`, rux-ui's read. All staff only. `record_row_history` and `record_line_history` are the trigger functions, with `history_actor` and `history_text` under them, and nobody calls those four. |
| Access, owner only, on the Account page | `is_owner`, `list_accounts`, `set_account_apps`; not callable without a log-in |

### Storage buckets

`trip-documents` (paths under the trip id), `driver-photos` and
`profile-photos`, with no size or file-type limit; only staff can upload,
replace or delete. The first two are private: staff pages read them through
ten-minute signed links, and the link pages through `trip-document-link` (§5).
`profile-photos` is public.

### Realtime

The old app subscribes to `postgres_changes` on `trips`, `trip_stops`,
`trip_assignments`, `trip_documents`, `trip_payments`, `trip_pos`,
`trip_invoices`, `trip_passengers` and `trip_ticket_options` for the grid,
and separately on notifications, team chat, dev notes and the game. A
30-second poll backs the grid up, and is the only thing that picks up
`trip_drivers`. This app subscribes twice: the board's `scheduler-board`
channel to the tables it draws from, and every page's `scheduler-to-do`
channel to `to_dos` and the trip tables its computed rows read.

## 3. Table to screen

Which screen of this app reads and writes each table. Screens are named
as in `screen-inventory.md`.

| Table | Read by | Written by |
|---|---|---|
| `trips` | Schedule, Trips search, driver page | Trip editor; a save that changes billing also writes `confirmed`, `balance_paid` and `date_paid`, derived as rux-ui derives them, and one that changes the route clears rux-ui's `itinerary_confirmed`; Cancel writes `cancelled_at` and `cancellation_reason` |
| `trip_assignments` (with `active_roles`), `trip_drivers` | Schedule, Drivers, Fleet | Trip editor's Buses tab, which updates, inserts and deletes rows by id and never writes `trip_drivers.pay`; the bus reassignment drag writes `trip_assignments.bus_id` alone, or inserts the row when the bar is an empty slot; Cancel deletes the trip's rows, and their drivers with them, as rux-ui's cancel does |
| `trip_stops` | Schedule, Trip editor Route tab, driver page | Trip editor Route tab: a leg's pickup, drop-off and return rows, added when missing |
| `buses`, `bus_out_of_service` | Schedule, Fleet, `../rux-ui/maintenance.html` | Fleet editor |
| `drivers`, `driver_time_off` | Schedule, Drivers | Driver editor |
| `contacts` | Trip editor, Customers | Customer editor, trip editor |
| `customers` | Trip editor, Customers, Locations | Customers page, trip editor |
| `trip_updates` | Schedule, trip editor | the Updates window, from Save or on its own; Cancel |
| `trip_payments`, `trip_pos`, `trip_invoices`, `trip_ticket_options` | Trip editor Billing | Trip editor |
| `trip_quote_lines` | Trip editor Billing, the customer quote on the Forms page | Trip editor, which writes `quoted_price` as the lines' sum |
| `trip_passengers`, `trip_passenger_payments` | Manifest | Manifest |
| `trip_documents` + bucket | Trip editor Files, driver page, `../rux-ui/doc.html` | Trip editor Files and the bar menu's Upload itinerary, each change with a `trip_history` entry |
| `trip_history` (RPC) | History page | every save in the trip editor |
| `record_history` (RPC) | History page | the database, on every change to a driver, a bus, a customer, a contact or a location |
| `trip_driver_statuses` (RPC) | Schedule, Tasks, Drivers | driver page accepts and declines; the bar menu's driver status items |
| `driver_schedule_shares` (RPC) | Driver editor | Driver editor |
| `settings` | Settings, trip editor defaults, the Billing tab's `billing-workflow-v1`, the Route tab's and Locations page's `yard-location-v1`, `geoapify-key-v1` and `route-times-v1`, and rux-ui's `mapbox-token-v1` | Settings |
| `notifications`, `notification_reads` | header bell | old app's notification job; unchanged |
| `trip_itineraries` | Itineraries, deferred | intake, deferred |

## 4. The Claude connector

`scheduler-connector`, one of the project's two Edge Functions, source in
`scheduler/connector/index.ts`. It serves MCP at
`/functions/v1/scheduler-connector`, which the Claude app speaks to a custom
connector, and it is deployed with Verify JWT off because it carries its own
check: `withOAuthProtectedResource` and `withSupabase({ auth: 'user' })` from
Supabase's middleware refuse a request with no token and answer the
unauthenticated one with the header that starts the sign-in. Every query runs
on the caller's own session, so the same rules apply to it as to a page.

Sign-in is Supabase's OAuth 2.1 server, whose consent screen is the site's
own page at `/oauth/consent/`; Supabase hosts none.

**Six tools read**, each on the tables above: `find_trips`, which also
matches the booking contact's name and email; `get_trip`, on `trips` with its
assignments, drivers and stops, the Email thread link, its pinned update, and warnings for a leg
short of buses or a stop dated outside its leg; `find_availability`, which
reads the trips running across a range and subtracts their buses and drivers,
then `bus_out_of_service` and `driver_time_off`, and lists each running trip
with the buses it needs and has, so a trip still waiting for a bus is counted
against the free ones and a placeholder is not; `find_contacts`, `list_buses` and `list_drivers`.

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

**Four tools are the To do list's,** on `to_dos` and nothing else.
`list_to_dos` reads the stored rows, not the rows the scheduler works out
from the trips, which `get_trip`'s warnings say. `add_to_do` adds a row as an
agent's, which the database makes Ruxbot's with the signed-in person beside
it; given a thread's key it changes the open row for that thread instead of
adding a second. `change_to_do` and `close_to_do` take only a row an agent
made, still open; a close names Ruxbot and carries its reason. An owner is
given by a staff member's name.

`scheduler/docs/working-from-claude.md` is how to use it.

## 5. The document link

`trip-document-link`, the project's other Edge Function, source in
`scheduler/trip-document-link/`. A page without a log-in posts a trip
document's id to `/functions/v1/trip-document-link` and gets back a link to the
file signed for ten minutes, or 404 for an id with no file. It reads with the
service role, since the bucket is closed to all but staff, and it is deployed
with Verify JWT off because the publishable key is not a token; the document's
id is its only secret, as it is on the link pages. It answers the site's origin
and the two local servers.
