/* ==========================================================================
   vehicles.js — WHAT A VEHICLE IS CALLED
   --------------------------------------------------------------------------
   The office's own list of vehicle types, the `vehicle-types-v1` settings
   row, and the one way a vehicle is named anywhere: its type, then its
   number, as "Coach 218" or "Van 12". Loaded by every page that names one.

   A type is `{ name, label?, icon }`. `label` is how the list writes it
   where that differs, as "Car / SUV" for Car, and `icon` is one of ICONS
   below. `name` is what four columns hold: `buses.type`,
   `trips.vehicle_type`, `trip_assignments.vehicle_type` and
   `customers.usual_vehicle_type`. `rename` changes all four.
   ========================================================================== */
(() => {
  'use strict';

  const KEY = 'vehicle-types-v1';

  // The drawings a type may wear. A type with none shows its initial.
  // Solid, to match the weight of the semibold headers and the solid
  // equipment marks they sit beside.
  const ICONS = {
    bus: { href: '#m-directions_bus-fill', label: 'Bus' },
    shuttle: { href: '#m-airport_shuttle-fill', label: 'Shuttle' },
    car: { href: '#m-directions_car-fill', label: 'Car' },
    truck: { href: '#m-local_shipping-fill', label: 'Truck' },
  };

  // What the list holds until it is read, so a page never names nothing.
  let types = [
    { name: 'Coach', icon: 'bus' },
    { name: 'Minibus', icon: 'shuttle' },
    { name: 'Van', icon: 'shuttle' },
    { name: 'Car', label: 'Car / SUV', icon: 'car' },
  ];

  const clean = list => (Array.isArray(list) ? list : [])
    .filter(t => t && String(t.name || '').trim())
    .map(t => ({ name: String(t.name).trim(), ...(t.label ? { label: String(t.label) } : {}),
      icon: ICONS[t.icon] ? t.icon : null }));

  const typeOf = name => types.find(t => t.name.toLowerCase() === String(name || '').trim().toLowerCase()) ?? null;

  /* "218": the office knows a vehicle by its number, and the type is said
     beside it where it matters. With no number, the type, or "Unit". */
  function label(vehicle) {
    const type = String(vehicle?.type || '').trim();
    const number = String(vehicle?.number ?? '').trim();
    return number || type || 'Unit';
  }

  // The drawing for a type, or null where it has none.
  const iconOf = name => ICONS[typeOf(name)?.icon]?.href ?? null;

  /* The ink that reads on a vehicle's colour, black or white, or null where
     the colour is not a six-digit hex and so draws nothing. */
  function inkOn(colour) {
    const hex = String(colour || '');
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return null;
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? '#000000' : '#ffffff';
  }

  // Reads the office's list; a refused read keeps the one there is.
  async function read(client) {
    if (!client) return types;
    const { data, error } = await client.from('settings').select('value').eq('key', KEY).maybeSingle();
    if (!error && Array.isArray(data?.value) && data.value.length) types = clean(data.value);
    return types;
  }

  // Saves the list as given, and keeps it.
  async function save(client, list) {
    const next = clean(list);
    const { error } = await client.from('settings').upsert({ key: KEY, value: next }, { onConflict: 'key' });
    if (error) throw new Error(error.message);
    types = next;
    return types;
  }

  /* Renames a type in every column that holds it. The database does it in one
     function, because a write to a trip's vehicles from the page takes Buses
     done and Billing done off the trip, and that function puts them back. */
  async function rename(client, was, name) {
    const { error } = await client.rpc('rename_vehicle_type', { p_was: was, p_name: name });
    if (error) throw new Error(error.message);
  }

  window.SchedulerVehicles = {
    ICONS, label, iconOf, inkOn, typeOf, read, save, rename,
    get types() { return types.map(t => ({ ...t })); },
    set: list => { if (Array.isArray(list) && list.length) types = clean(list); },
  };
})();
