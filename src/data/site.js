/* Event config. Every value comes from Sai (PLAN.md "Confirmed by Sai" and the build contract) or from the official site
   https://hack.arizona.edu/, which Sai said to use; null means not given yet, and whatever renders it must show a
   placeholder. Arizona keeps MST all year (no daylight saving). */
export const site = {
  event: {
    name: 'Hack Arizona 2027',
    start: '2027-03-27',
    end: '2027-03-28',
    startTime: null, // 'HH:MM' in the event time zone, when Sai confirms it
    endTime: null,
    timezone: 'America/Phoenix',
    venue: 'HSIB (Health Sciences Innovation Building)',
    city: 'Tucson, AZ',
  },
  registration: { opensMonth: '2027-01', url: null, platform: null },
  links: { email: 'hackaz@arizona.edu', instagram: 'https://www.instagram.com/hack.arizona/', discord: 'https://discord.gg/8BkZftYGWp', codeOfConduct: 'https://github.com/MLH/mlh-policies/blob/main/code-of-conduct.md' },
  mlhMember: null,
  // The sponsor contact form. Web3Forms delivers each submission to the inbox the key was created for
  // (hackaz@arizona.edu); the key is public by design. Until it is set, the form opens a pre-filled email instead.
  forms: { sponsorEndpoint: 'https://api.web3forms.com/submit', sponsorKey: null },
  // The story film. Until src is set the Story page shows a "coming soon" frame. src may be a video file in public/
  // (e.g. '/video/our-story.mp4') or a YouTube link; captions (WebVTT, for a file) are optional but recommended.
  film: { src: null, captions: null },
};

/** The wall-clock time in a time zone as 'YYYY-MM-DDTHH:MM', so it compares as a string against config dates. */
export function localStamp(now, timeZone) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

/** The status line for a moment in time, judged on the event's own clock (America/Phoenix). */
export function statusFor(now = new Date(), config = site) {
  const { event, registration } = config;
  const stamp = localStamp(now, event.timezone);
  const start = `${event.start}T${event.startTime ?? '00:00'}`;
  // Without an end time the event runs to the end of its last day; 'T24:00' sorts after every 'T23:59'.
  const end = `${event.end}T${event.endTime ?? '24:00'}`;
  if (stamp >= end) return 'See you next year';
  if (stamp >= start) return 'Happening now';
  if (stamp.slice(0, 7) < registration.opensMonth) {
    const month = new Date(`${registration.opensMonth}-15T12:00:00Z`).toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
    return `Registration opens in ${month}`;
  }
  return registration.url ? 'Registration open' : 'Registration opening soon';
}
