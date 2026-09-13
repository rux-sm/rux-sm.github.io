# Backend inventory

Written 2026-09-06 from the schema snapshot in `rux-backend`
(`supabase/migrations/20260903160350_remote_schema.sql`, pulled 2026-09-03
from project `udnmqhayzhrbltxzzhjw`) and the old app's data layer
(`rux-ui/js/data/*.js`). This app is a frontend replacement: it reads and
writes the tables below as they are. Nothing here is a schema change.

The snapshot is the contract. When it and this page disagree, re-pull and
fix this page; do not fix the schema to match the page.

## 1. How the old app reaches the backend, and what that means here

- **No sign-in.** `rux-ui/js/data/supabase.js` creates one client with the
  anon key and never calls any auth method. Every request is anon-role.
- **Through a proxy.** The client's URL is a Cloudflare Worker
  (`rux-ui/worker/`), a transparent pass-through to the Supabase host plus
  one route of its own, `/ai/extract`, used only by the intake page.
- **The core tables are open to that key.** `trips`, `buses`, `drivers`,
  `trip_assignments`, `trip_drivers` and `trip_stops` each carry one policy
  named `dev_all`: `for all to public using (true)`. `bus_out_of_service`,
  `contacts`, `driver_time_off`, passengers, tickets, notifications, chat and
  profiles carry the same effect as a public-select plus manage-all pair.
- **Four tables have no RLS at all:** `settings`, `trip_documents`,
  `trip_itineraries`, `trip_payments`.
- **Eight tables have RLS and no policy**, so they are reachable only through
  `security definer` functions: `trip_requests`, `trip_history`,
  `driver_schedule_shares`, `maintenance_schedule_shares`,
  `trip_driver_confirmations`, `trip_driver_statuses`, `trip_buses`,
  `trip_docs`.

**What this settles for the new app.** Because every open policy is
permissive `to public`, an authenticated session passes them exactly as the
anon role does. The new app can therefore sign in through the platform
(`platform.profiles`, anonymous or GitHub, already live) from its first
commit without breaking the old app, which keeps running unauthenticated
against the same rows. Tightening any policy to `authenticated` or to an
owner is a cutover step, taken only when the old app is retired, and it is a
`rux-backend` migration, never a change from here.

The new app should talk to the Supabase host directly. Supabase serves CORS
itself; the Worker earns its place only for `/ai/extract`, which belongs to
the deferred intake page.

## 2. Tables

Column lists are complete for the six tables the schedule grid depends on;
the rest name the columns that matter to a screen. Enumerations are `check`
constraints, not types; there are no views.

### The grid's six

| Table | Key and links | Columns |
|---|---|---|
| `trips` | `id`; `booking_contact_id` and `trip_contact_1..5_id` to `contacts` | 88 columns. Scheduling: `destination`, `customer`, `start_date`, `end_date`, `departure_time`, `spot_time`, `return_time`, `return_start_date`, `return_end_date`, `bus_count`, `return_bus_count`, `trip_type` (round_trip, one_way, dropoff_pickup), `trip_bar_color`. Contacts: booking plus five trip contacts, each name, phone, email, id. Money: `quoted_price`, `deposit_amount`, `invoice_number`, `po_ref`, `po_amount`, `contract_status`, `invoice_status`, `balance_paid`, `date_paid`. Needs: `req_sleeper`, `req_56pax`, `req_ada`, `need_hotel`, `need_fuel_card`, `trip_reqs` jsonb. Per-leg workflow booleans: `driver_contact_sent_*`, `trip_reminder_sent_*`, `envelope_printed_*`, `fuel_card_assigned_*`, `hotel_booked_*`, `itinerary_printed_*`, `hos_form_printed_*` for outbound and return. Audit: `created_at`, `updated_at` (trigger), `cancelled_at`, `cancellation_reason`, `itinerary_confirmed`, `confirmed`. |
| `buses` | `id`; `bus_ref` generated `BUS-###` by trigger | `number`, `capacity`, `type`, `ada_lift`, `sleeper`, `status` (active, inactive), `make`, `model`, `year`, `vin`, `color`, `mileage`, `last_service`, `next_service`, `insurance_exp`, `registration_exp`, `inspection_exp`, `sort_order`, `notes` |
| `drivers` | `id`; `driver_ref` generated `DRV-###` by trigger | `name`, `short_name`, `phone`, `email`, `texting_url`, address fields, `date_of_birth`, `hire_date`, `employment_type` (full-time, part-time, contract, seasonal), `status`, `priority` (1 to 5), `sort_order`, `cdl_class`, `license_number`, `license_state`, `license_exp`, `med_card_expiry`, `endorsements` text[], `emergency_contact_name`, `emergency_contact_phone`, `photo_path`, `notes` |
| `trip_stops` | `id`; `trip_id` to `trips`, cascade | `position`, `leg` (outbound, return), `type`, `label`, `name`, `address`, `lat`, `lng`, `mapbox_id`, `miles`, `drive`, `miles_source` and `drive_source` (estimated, manual), `depart_prev`, `arrive`, `spot`, `depart_prev_date`, `arrive_date`, `spot_date`, `dwell_status` (off, sleeper, on), `dwell_reset`, `route_status` |
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
| `trip_payments` | trip editor Billing tab | `trip_id`, `position`, `amount`, `method`, `date`, `ref`. No RLS. Old app rewrites all rows on save. |
| `trip_ticket_options` | trip editor, manifest | `trip_id`, `position`, `label`, `price` |
| `trip_passengers` | manifest | 17 columns: `name`, `phone`, `email`, `seat`, `status`, `ticket_option_id`, `amount_owed`, `amount_paid`, `group_label`, `pickup_location` |
| `trip_passenger_payments` | manifest | `passenger_id`, `amount`, `method`, `date`, `ref` |
| `trip_documents` | trip editor Files, driver page, `doc.html` | `trip_id`, `label`, `file_name`, `file_path`, `file_size`. No RLS. Files in bucket `trip-documents`. |
| `trip_itineraries` | Itineraries view | `trip_id` (unique when set), `document` jsonb, `status` (new, reviewed, closed), `label`. No RLS. |
| `trip_requests` | Requests view, `request.html` | `reference` (`REQ-` plus six), `status`, `source`, `contact` jsonb, `payload` jsonb, `trip_id`. RPC only. |
| `trip_history` | History tab | `trip_id`, `trip_ref`, `action` (nine values), `changes` jsonb, `metadata` jsonb. RPC only. |
| `trip_driver_statuses` | driver page, Tasks | `trip_id`, `driver_id`, `leg`, `role`, `status` (five values), `source` (dispatcher, driver), `accepted_at`, `declined_at`. RPC only. |
| `trip_driver_confirmations` | legacy | superseded by `trip_driver_statuses`; still written by the confirm and decline RPCs |
| `driver_schedule_shares` | driver editor, `driver.html` | `token`, `driver_id`, `trip_legs` jsonb, `range_start`, `range_end`, `expires_at`, `revoked_at`. RPC only. |
| `maintenance_schedule_shares` | `maintenance.html` | one row, `scope = 'main'`, `token`, `revoked_at`. RPC only. |
| `settings` | Settings view | key-value, `value` jsonb. Yard, locations, requirements and billing defaults live here. No RLS. |
| `profiles` | old app's local identity | `display_name`, `photo_path`, `settings` jsonb, `avatar_color`. **Not the platform profile.** Unrelated to `platform.profiles` and replaced by it in this app. |
| `notifications`, `notification_reads` | header bell | `type` (three values), `severity`, `title`, `ref_table`, `ref_id`, `dedupe_key` unique |
| `team_messages`, `team_message_reactions`, `team_chat_reads` | team chat | dropped from this app, see the screen inventory |
| `dev_notes` | dev notes popover | dropped |
| `game_*` (four tables, nine functions) | Flip Seven | dropped |
| `trip_docs`, `trip_buses` | nothing | referenced by no code; leave alone |

### Functions the app calls

Trigger functions `set_bus_ref`, `set_driver_ref`, `touch_trips_updated_at`,
`trip_itineraries_touch` run on their own. The RPCs a screen calls:

| Area | Functions |
|---|---|
| Driver share links | `create_driver_schedule_share`, `update_driver_schedule_share`, `get_driver_schedule_share`, `get_driver_schedule_share_for_driver`, `revoke_driver_schedule_share` |
| Driver acceptance | `confirm_trip_assignment`, `decline_trip_assignment`, `get_trip_driver_statuses`, `sync_trip_driver_statuses`, `get_driver_assignment_statuses`, `get_driver_confirmations` |
| Maintenance link | `create_maintenance_schedule_share`, `get_maintenance_schedule_share`, `get_maintenance_schedule`, `get_maintenance_schedule_changes`, `revoke_maintenance_schedule_share` |
| Trip requests | `create_trip_request`, `submit_trip_request`, `get_trip_request`, `list_trip_requests`, `update_trip_request_status`, `link_trip_request`, `delete_trip_request`, `new_trip_request_reference` |
| History | `record_trip_history`, `get_trip_history` |

### Storage buckets

`trip-documents` (paths under the trip id), `driver-photos`,
`profile-photos`, `trip-request-uploads` (private, signed URLs; no storage
policy in the snapshot). Bucket creation is not in the snapshot either, so
public and size settings are only visible in the dashboard.

### Realtime

The old app subscribes to `postgres_changes` on `trips`, `trip_stops`,
`trip_assignments`, `trip_documents`, `trip_payments`, `trip_passengers`,
`trip_ticket_options` for the grid, and separately on notifications, chat,
dev notes and the game. `trip_drivers` is not subscribed; a 30-second poll
covers it. Realtime is not needed for the first read-only grid here.

## 3. Table to screen

Which screen of the new app reads and writes each table. Screens are named
as in `screen-inventory.md`.

| Table | Read by | Written by |
|---|---|---|
| `trips` | Schedule, Trips search, driver page | Trip editor |
| `trip_assignments`, `trip_drivers` | Schedule, Drivers, Fleet | Trip editor; the bus reassignment drag writes `trip_assignments.bus_id` alone |
| `trip_stops` | Trip editor Itinerary tab, driver page | Trip editor |
| `buses`, `bus_out_of_service` | Schedule, Fleet, `maintenance.html` | Fleet editor |
| `drivers`, `driver_time_off` | Schedule, Drivers | Driver editor |
| `contacts` | Trip editor, Customers | Customer editor, trip editor |
| `trip_payments`, `trip_ticket_options` | Trip editor Billing | Trip editor |
| `trip_passengers`, `trip_passenger_payments` | Manifest | Manifest |
| `trip_documents` + bucket | Trip editor Files, driver page, `doc.html` | Trip editor |
| `trip_requests` (RPC) | Requests, `request.html` | `request.html` submits; Requests changes status and links |
| `trip_history` (RPC) | History | every save in the trip editor |
| `trip_driver_statuses` (RPC) | Tasks, Drivers | driver page accepts and declines |
| `driver_schedule_shares` (RPC) | Driver editor | Driver editor |
| `settings` | Settings, trip editor defaults | Settings |
| `notifications`, `notification_reads` | header bell | old app's notification job; unchanged |
| `trip_itineraries` | Itineraries, deferred | intake, deferred |

## 4. Unknowns, to resolve before the write paths

- `rux-ui/js/data/trip-request-db.js` calls `attach_trip_request_document`
  and `list_trip_request_documents`, and cites a `trip_request_documents`
  table. None of that is in the snapshot. Either the live project moved past
  2026-09-03 or a migration is missing from `rux-backend`. Re-pull before
  building Requests.
- No `grant` or `revoke` on the RPCs appears in the snapshot, so the execute
  rights of `anon` on the security-definer functions are the Postgres
  default, not a decision. Confirm in the dashboard before the driver page.
- Bucket settings and the `trip-request-uploads` policy are dashboard-only.
