/* ==========================================================================
   inspection-items.js — WHAT A MONTHLY INSPECTION CHECKS
   --------------------------------------------------------------------------
   The paper Monthly Vehicle Inspection Checklist, as data: its tire
   positions and its items by section. An item's `id` is the key
   `bus_inspections.results` stores its result under, so one is never
   renamed once an inspection holds it; the label may change.
   ========================================================================== */
(() => {
  'use strict';

  // The eight tire positions, in the order the form draws them.
  const TIRES = [
    ['LF', 'Left front'], ['RF', 'Right front'],
    ['LI', 'Left inner drive'], ['RI', 'Right inner drive'],
    ['LO', 'Left outer drive'], ['RO', 'Right outer drive'],
    ['LT', 'Left tag'], ['RT', 'Right tag'],
  ];

  const SECTIONS = [
    { name: 'Interior and exterior', items: [
      ['lights-exterior', 'Head lights, tail lights, turn signals, brake lights'],
      ['lights-hazard', 'Hazard lights, exterior lamps, license plate lights'],
      ['wipers', 'Windshield washer and wiper operation, wiper blades'],
      ['windshield', 'Windshield condition: cracks, chips, pitting'],
      ['mirrors-exits', 'Mirrors, side windows, emergency exit signage'],
      ['parking-brake', 'Parking brake functionality'],
      ['horn', 'Horn operation'],
      ['ac-freon', 'Air conditioning Freon level'],
      ['ac-filter', 'Air conditioning filter'],
      ['backup-lights', 'Back up lights, left and right'],
      ['gauges', 'Instrument cluster gauges, warning lights'],
      ['seats-restroom', 'Passenger seats, seat belts, restroom'],
    ] },
    { name: 'Under vehicle', items: [
      ['suspension', 'Shock absorbers, suspension, struts, air springs'],
      ['steering', 'Steering box, linkage, ball joints'],
      ['exhaust', 'Muffler, exhaust pipes and mounts, SCR, DPF'],
      ['leaks', 'Engine oil and fluid leaks'],
      ['air-lines', 'Air lines, hoses, distribution blocks, valves for leaks'],
      ['drive-shaft', 'Drive shaft, U-joints'],
      ['transmission', 'Transmission, differential: fluid level, condition and leaks'],
      ['wheel-bearings', 'Wheel bearings, output shaft seals'],
      ['nuts-bolts', 'Nuts and bolts on body and chassis'],
    ] },
    { name: 'Under hood', items: [
      ['fluids', 'Fluids: oil, coolant, power steering, washer fluid, automatic transmission'],
      ['engine-air-filter', 'Engine air filter'],
      ['belts', 'Drive belts: condition and adjustment'],
      ['hoses', 'Cooling system hoses, air conditioning hoses and connections'],
      ['radiator', 'Radiator core, air conditioner condenser'],
      ['coolant-reservoir', 'Coolant recovery reservoir fluid level and condition'],
    ] },
    { name: 'Battery performance', items: [
      ['battery-terminals', 'Battery terminals and cables for corrosion'],
      ['battery-age', 'Age of batteries, voltage readouts of the 12V and 24V systems'],
    ] },
  ].map(s => ({ name: s.name, items: s.items.map(([id, label]) => ({ id, label })) }));

  // The quarterly emergency exit inspection, the paper's other checklist.
  const EXIT_SECTIONS = [
    { name: 'Emergency exits', items: [
      ['pushout-windows', 'Check push-out windows'],
      ['emergency-doors', 'Emergency doors'],
      ['emergency-door-lights', 'Emergency door lights'],
    ] },
  ].map(s => ({ name: s.name, items: s.items.map(([id, label]) => ({ id, label })) }));

  // What a result is called on the form and in a defect's summary.
  const RESULTS = { ok: 'OK', watch: 'May need attention', now: 'Requires immediate attention' };

  window.SchedulerInspection = { TIRES, SECTIONS, EXIT_SECTIONS, RESULTS };
})();
