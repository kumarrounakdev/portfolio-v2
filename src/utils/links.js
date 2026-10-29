import { profile } from '../data/portfolio.js';

/** True when a configuration string contains something usable. */
export function isSet(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * The schemes this site is allowed to put in an `href`.
 *
 * Every link on the page comes from `src/data/`, which makes a pasted
 * `javascript:…` or `data:text/html,…` a configuration typo away from being an
 * executable URL in an anchor — the one place in a static site where a string can
 * still become code. Anything outside this list is dropped and the anchor renders
 * as a plain button or not at all, which is why the check below is a whitelist and
 * not a `javascript:` blacklist: there are more schemes than anyone remembers.
 *
 * Relative paths are allowed (the résumé PDF is `/resume-…pdf`), mailto and tel are
 * allowed because the whole Contact window is built on them.
 */
const SAFE_SCHEMES = ['http', 'https', 'mailto', 'tel'];

export function safeHref(value) {
  if (!isSet(value)) return '';
  /* Written as a URL would be: strip the whitespace and control characters that a
     browser ignores before parsing, so `java\nscript:` cannot slip through. */
  const cleaned = value.trim().replace(/[\u0000-\u0020\u007f]+/g, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(cleaned);
  if (!scheme) {
    /* No scheme: a path, a fragment or a protocol-relative URL. `//evil.example`
       is refused because this site has no reason to link off it that way. */
    return cleaned.startsWith('//') ? '' : cleaned;
  }
  return SAFE_SCHEMES.includes(scheme[1].toLowerCase()) ? cleaned : '';
}

/** Common props for a link that leaves the site. */
export function externalLinkProps(url) {
  return {
    href: safeHref(url),
    target: '_blank',
    /* noreferrer as well as noopener: noopener stops the new tab reaching back
       through window.opener, noreferrer stops it learning where the reader came
       from. Neither costs anything here. */
    rel: 'noreferrer noopener',
  };
}

export function githubProfileUrl() {
  return isSet(profile.links?.github) ? profile.links.github.trim() : '';
}

export function githubUsername() {
  const configured = profile.links?.githubUsername;
  if (isSet(configured)) return configured.replace(/^@/, '');
  const match = githubProfileUrl().match(/github\.com\/([^/]+)/i);
  return match ? match[1] : '';
}

export function linkedinUrl() {
  return isSet(profile.links?.linkedin) ? profile.links.linkedin.trim() : '';
}

export function email() {
  return isSet(profile.email) ? profile.email.trim() : '';
}

export function resumeUrl() {
  return isSet(profile.resumeUrl) ? profile.resumeUrl.trim() : '';
}

/** wa.me needs digits only: no '+', spaces or brackets. */
export function whatsappNumber() {
  const raw = typeof profile.phone === 'string' ? profile.phone : '';
  const digits = raw.replace(/[^\d]/g, '');
  // Country code + subscriber number; anything shorter than 8 digits is a typo.
  return digits.length >= 8 ? digits : '';
}

/** '+91 81787 82184' from the same digits the link uses — formatting only. */
function whatsappLabel() {
  const number = whatsappNumber();
  if (!number) return '';
  if (number.startsWith('91') && number.length === 12) {
    return `+${number.slice(0, 2)} ${number.slice(2, 7)} ${number.slice(7)}`;
  }
  return `+${number}`;
}

export function whatsappUrl(message) {
  const number = whatsappNumber();
  if (!number) return '';
  const text = message ?? profile.whatsappMessage ?? '';
  return isSet(text)
    ? `https://wa.me/${number}?text=${encodeURIComponent(text.trim())}`
    : `https://wa.me/${number}`;
}

/**
 * The address and nothing else. A portfolio does not know what a visitor wants
 * to ask, and a `mailto:` that writes the first line of their letter for them —
 * "Project enquiry" — fills their subject field with a stranger's words, so the
 * link hands over a blank message to a known address and leaves the writing to them.
 */
export function mailtoUrl() {
  const address = email();
  return address ? `mailto:${address}` : '';
}

/** True when the browser supports the asynchronous clipboard API. */
function canCopy() {
  return typeof navigator !== 'undefined' && !!navigator.clipboard?.writeText;
}

export async function copyText(value) {
  if (!isSet(value)) return false;
  try {
    if (canCopy()) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (error) {
    /* falls through to the textarea technique below */
  }
  try {
    const area = document.createElement('textarea');
    area.value = value;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch (error) {
    return false;
  }
}

/**
 * Contact channels used by the Contact window, the hero and the menus.
 * Anything unconfigured is filtered out, so no button can be a dead link.
 */
export function contactChannels() {
  const channels = [
    {
      id: 'email',
      label: 'Email',
      value: email(),
      href: mailtoUrl(),
      external: false,
      note: 'Opens your mail app',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      value: whatsappLabel(),
      href: whatsappUrl(),
      external: true,
      note: 'Message pre-filled',
    },
    {
      id: 'github',
      label: 'GitHub',
      value: githubUsername() ? `@${githubUsername()}` : '',
      href: githubProfileUrl(),
      external: true,
      note: 'Source code',
    },
    {
      id: 'linkedin',
      label: 'LinkedIn',
      value: linkedinUrl().replace(/^https?:\/\/(www\.)?/, ''),
      href: linkedinUrl(),
      external: true,
      note: 'Professional profile',
    },
  ];
  return channels.filter((channel) => isSet(channel.href) && isSet(channel.value));
}

export function isExternalHref(href) {
  return /^https?:\/\//i.test(href || '');
}
