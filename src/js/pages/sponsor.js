// Sponsor page module, owned by the sponsor stage. Import shared helpers from ../shell.js (see src/COMPONENTS.md).
// The contact form: checks the two required fields, then sends the details to Web3Forms, which emails them to
// hackaz@arizona.edu. Until site.forms.sponsorKey is set (or if sending fails) it opens a pre-filled email instead.
// Without JavaScript the form falls back to its mailto: action.
import { site } from '../../data/site.js';

const form = document.querySelector('[data-sponsor-form]');
const status = form?.querySelector('[data-sponsor-status]');
const button = form?.querySelector('button[type="submit"]');

function say(text, kind = '') {
  status.textContent = text;
  status.className = `sponsor-status${kind ? ` is-${kind}` : ''}`;
}

/** Marks a required field and shows its message under it; returns whether it is valid. */
function check(input, message) {
  const box = input.closest('.sponsor-field');
  let note = box.querySelector('.sponsor-error');
  const valid = input.checkValidity();
  input.setAttribute('aria-invalid', String(!valid));
  if (valid) {
    note?.remove();
    input.removeAttribute('aria-describedby');
    return true;
  }
  if (!note) {
    note = document.createElement('p');
    note.className = 'sponsor-error';
    note.id = `${input.id}-error`;
    box.append(note);
  }
  note.textContent = message;
  input.setAttribute('aria-describedby', note.id);
  return false;
}

function details() {
  const data = new FormData(form);
  return {
    name: String(data.get('name')).trim(),
    email: String(data.get('email')).trim(),
    organisation: String(data.get('organisation') || '').trim(),
    interests: data.getAll('interests').join(', '),
    message: String(data.get('message') || '').trim(),
    botcheck: data.get('botcheck') === 'on',
  };
}

function openEmail(d) {
  const lines = [
    `Name: ${d.name}`,
    `Email: ${d.email}`,
    d.organisation && `Organisation: ${d.organisation}`,
    d.interests && `Interested in: ${d.interests}`,
    d.message && `\n${d.message}`,
  ].filter(Boolean);
  const subject = `Sponsoring Hack Arizona${d.organisation ? `: ${d.organisation}` : ''}`;
  location.href = `mailto:${site.links.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
  say('Your email app should open with your details filled in. Press send there and we will be in touch.', 'done');
}

async function send(d) {
  const response = await fetch(site.forms.sponsorEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      access_key: site.forms.sponsorKey,
      subject: `New sponsor enquiry${d.organisation ? `: ${d.organisation}` : ''}`,
      from_name: 'Hack Arizona website',
      name: d.name,
      email: d.email,
      organisation: d.organisation || '(not given)',
      interests: d.interests || '(none picked)',
      message: d.message || '(none)',
      botcheck: d.botcheck,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.success) throw new Error(result.message || `HTTP ${response.status}`);
}

if (form) {
  const name = form.querySelector('#sf-name');
  const email = form.querySelector('#sf-email');
  const fields = [[name, 'Please add your name.'], [email, 'Please add an email address we can reply to.']];
  fields.forEach(([input, message]) => input.addEventListener('blur', () => input.value && check(input, message)));
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const valid = fields.map(([input, message]) => check(input, message));
    if (valid.includes(false)) {
      fields[valid.indexOf(false)][0].focus();
      say('');
      return;
    }
    const d = details();
    if (d.botcheck) return;
    if (!site.forms.sponsorKey) {
      openEmail(d);
      return;
    }
    button.disabled = true;
    say('Sending…');
    try {
      await send(d);
      form.reset();
      say(`Thank you, ${d.name.split(' ')[0]}. We have your details and will be in touch soon.`, 'done');
    } catch {
      say('That did not go through. Opening your email app instead.', 'error');
      openEmail(d);
    } finally {
      button.disabled = false;
    }
  });
}
