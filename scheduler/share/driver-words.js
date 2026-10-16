/* ==========================================================================
   share/driver-words.js — WHAT A DRIVER'S SCHEDULE LINK SAYS, IN EACH LANGUAGE
   --------------------------------------------------------------------------
   Every word driver.js and driver.html write, once in English and once in
   Spanish, keyed by what the line says. A line that takes something from the
   trip is a function of it. The two tables hold the same keys, and
   scheduler/tools/check-driver-words.mjs fails when they do not, so a line
   added in English cannot reach a driver untranslated.

   Only what the page writes is here. What the office typed, the destination,
   the customer, a stop, a driver's instructions, stays as typed, and the
   words the card keeps when a driver accepts stay in English in driver.js,
   so a driver set to Spanish is not asked about every trip again.

   The Spanish speaks to the driver as tú.
   ========================================================================== */
(() => {
  'use strict';

  const en = {
    pageTitle: 'Your schedule',
    skip: 'Skip to main content',
    switchTo: 'Ver en español',
    hello: name => `Hello ${name}`,
    waiting: n => (n === 1 ? '1 trip needs your answer' : `${n} trips need your answer`),
    allAnswered: 'You have answered every trip',
    tryAgain: 'Try again',

    noToken: 'This link has no schedule in it',
    noTokenText: 'Ask dispatch for a new driver schedule link.',
    cannotLoad: "Your schedule can't be loaded right now",
    checkConnection: 'Check your connection and try again.',
    inactive: 'This link is no longer active',
    inactiveText: 'Contact dispatch if you still need your schedule.',
    noTrips: 'No current assignments',
    noTripsText: 'New assignments will appear here after dispatch schedules them.',
    wentWrong: 'Something went wrong',
    unavailable: 'Assignment unavailable',
    notLoaded: 'This assignment could not be loaded.',
    notYours: 'This assignment is no longer assigned to you.',

    today: 'Today',
    tomorrow: 'Tomorrow',
    assignment: 'Assignment',
    bus: number => `Bus ${number}`,
    busNotSet: 'Bus not set',
    accepted: 'Accepted',
    declined: 'Declined',
    yard: 'Yard',
    destination: 'Destination',
    crewMember: 'Crew member',

    role: { 'driver': 'Driver', 'co-driver': 'Co-driver', 'relief': 'Relief driver' },
    crewRole: { 'driver': 'Driver', 'co-driver': 'Co-driver', 'relief': 'Relief' },

    handoffAt: time => `Handoff at ${time}`,
    agreeHandoff: name => `Agree the handoff time with ${name}`,
    handoffComing: 'Dispatch will send the handoff time',
    spotAt: time => `Spot at ${time}`,
    tripPickup: place => `Trip pickup: ${place}`,
    map: 'Map',
    directionsTo: place => `Directions to ${place}`,

    contact: 'Contact',
    noName: 'No name given',
    call: 'Call',
    text: 'Text',
    callName: name => `Call ${name}`,
    textName: name => `Text ${name}`,
    showAllCrew: n => `Show all crew (${n})`,
    showLessCrew: 'Show less crew',

    viewItinerary: updated => (updated ? 'View itinerary (updated)' : 'View itinerary'),
    noItinerary: 'No itinerary',
    viewEnvelope: 'View envelope',

    changedTitle: 'This trip changed since you accepted it',
    changedCheck: 'Check the details below, then answer again.',
    newItinerary: 'New itinerary',
    itineraryRemoved: 'Itinerary removed',
    stopsChanged: 'Stops changed',
    changed: what => `${what} changed`,
    changedJustNow: 'This trip just changed. Read it again, then answer.',
    stops: n => `Stops (${n})`,
    stopArrive: time => `arrive ${time}`,
    stopLeave: time => `leave ${time}`,
    stopUnnamed: 'Stop',
    cancelled: 'Cancelled',
    cancelledText: "This trip was cancelled. You don't need to do anything.",
    added: list => `Added: ${list}`,
    removed: list => `Removed: ${list}`,
    none: 'none',
    view: {
      dates: 'Dates', time: 'Spot time', place: 'Pickup', destination: 'Destination', bus: 'Bus',
      role: 'Role', relief: 'Relief details',
    },

    accept: 'Accept',
    decline: 'Decline',
    accepting: 'Accepting…',
    declining: 'Declining…',
    acceptedSaid: 'Assignment accepted',
    declinedSaid: 'Assignment declined',
    couldNotAccept: "We couldn't accept this assignment. Check your connection and try again.",
    couldNotDecline: "We couldn't decline this assignment. Check your connection and try again.",

    declineTitle: 'Decline this assignment?',
    declineText: "Dispatch will be told that you can't take this trip.",
    declineKeep: 'Keep the assignment',
    cancel: 'Cancel',
    declineConfirm: 'Decline assignment',

    // Requirement names the page writes for a trip saved before the office kept a list.
    legacy: { sleeper: 'Sleeper bus', pax56: '56-passenger bus', adaLift: 'Wheelchair lift', hotel: 'Hotel', fuelCard: 'Fuel card' },
  };

  const es = {
    pageTitle: 'Tu horario',
    skip: 'Saltar al contenido',
    switchTo: 'View in English',
    hello: name => `Hola ${name}`,
    waiting: n => (n === 1 ? 'Tienes 1 viaje por responder' : `Tienes ${n} viajes por responder`),
    allAnswered: 'Ya respondiste todos tus viajes',
    tryAgain: 'Intentar de nuevo',

    noToken: 'Este enlace no tiene un horario',
    noTokenText: 'Pide a despacho un enlace nuevo de tu horario.',
    cannotLoad: 'No se puede cargar tu horario ahora',
    checkConnection: 'Revisa tu conexión e inténtalo de nuevo.',
    inactive: 'Este enlace ya no está activo',
    inactiveText: 'Comunícate con despacho si todavía necesitas tu horario.',
    noTrips: 'No tienes viajes por ahora',
    noTripsText: 'Los viajes nuevos aparecerán aquí cuando despacho te los asigne.',
    wentWrong: 'Algo salió mal',
    unavailable: 'Viaje no disponible',
    notLoaded: 'No se pudo cargar este viaje.',
    notYours: 'Este viaje ya no está asignado a ti.',

    today: 'Hoy',
    tomorrow: 'Mañana',
    assignment: 'Viaje',
    bus: number => `Autobús ${number}`,
    busNotSet: 'Autobús sin asignar',
    accepted: 'Aceptado',
    declined: 'Rechazado',
    yard: 'Patio',
    destination: 'Destino',
    crewMember: 'Compañero',

    role: { 'driver': 'Chofer', 'co-driver': 'Segundo chofer', 'relief': 'Chofer de relevo' },
    crewRole: { 'driver': 'Chofer', 'co-driver': 'Segundo chofer', 'relief': 'Relevo' },

    handoffAt: time => `Relevo a las ${time}`,
    agreeHandoff: name => `Acuerda la hora del relevo con ${name}`,
    handoffComing: 'Despacho te enviará la hora del relevo',
    spotAt: time => `Llegar a las ${time}`,
    tripPickup: place => `Recogida del viaje: ${place}`,
    map: 'Mapa',
    directionsTo: place => `Cómo llegar a ${place}`,

    contact: 'Contacto',
    noName: 'Sin nombre',
    call: 'Llamar',
    text: 'Mensaje',
    callName: name => `Llamar a ${name}`,
    textName: name => `Mandar mensaje a ${name}`,
    showAllCrew: n => `Ver todos los choferes (${n})`,
    showLessCrew: 'Ver menos',

    viewItinerary: updated => (updated ? 'Ver itinerario (actualizado)' : 'Ver itinerario'),
    noItinerary: 'Sin itinerario',
    viewEnvelope: 'Ver sobre',

    changedTitle: 'Este viaje cambió desde que lo aceptaste',
    changedCheck: 'Revisa los detalles abajo y vuelve a responder.',
    newItinerary: 'Itinerario nuevo',
    itineraryRemoved: 'Se quitó el itinerario',
    stopsChanged: 'Cambiaron las paradas',
    changed: what => `Cambió: ${what}`,
    changedJustNow: 'Este viaje acaba de cambiar. Léelo otra vez y luego responde.',
    stops: n => `Paradas (${n})`,
    stopArrive: time => `llega ${time}`,
    stopLeave: time => `sale ${time}`,
    stopUnnamed: 'Parada',
    cancelled: 'Cancelado',
    cancelledText: 'Este viaje se canceló. No tienes que hacer nada.',
    added: list => `Se agregó: ${list}`,
    removed: list => `Se quitó: ${list}`,
    none: 'nada',
    view: {
      dates: 'Fechas', time: 'Hora de llegada', place: 'Recogida', destination: 'Destino', bus: 'Autobús',
      role: 'Puesto', relief: 'Detalles del relevo',
    },

    accept: 'Aceptar',
    decline: 'Rechazar',
    accepting: 'Aceptando…',
    declining: 'Rechazando…',
    acceptedSaid: 'Viaje aceptado',
    declinedSaid: 'Viaje rechazado',
    couldNotAccept: 'No pudimos aceptar este viaje. Revisa tu conexión e inténtalo de nuevo.',
    couldNotDecline: 'No pudimos rechazar este viaje. Revisa tu conexión e inténtalo de nuevo.',

    declineTitle: '¿Rechazar este viaje?',
    declineText: 'Le avisaremos a despacho que no puedes hacer este viaje.',
    declineKeep: 'Quedarme con el viaje',
    cancel: 'Cancelar',
    declineConfirm: 'Rechazar viaje',

    legacy: { sleeper: 'Autobús con litera', pax56: 'Autobús de 56 pasajeros', adaLift: 'Elevador para silla de ruedas', hotel: 'Hotel', fuelCard: 'Tarjeta de combustible' },
  };

  // How each language writes a date, through the browser's own formatting.
  const LOCALE = { en: 'en-US', es: 'es-MX' };

  window.SchedulerDriverWords = { en, es, LOCALE };
})();
