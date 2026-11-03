/**
 * Every word a visitor or moderator can read, apart from the six content pages
 * (see ./pages.ts). Edit freely. No file outside src/content/ contains copy.
 *
 * Text may contain plain characters only (no HTML). Multi-paragraph fields
 * are arrays, one paragraph per item.
 */
export const copy = {
  siteName: 'Shai Collective',
  /** Generic on purpose: it is what search engines and link previews would show. */
  siteDescription: 'A community collective. Tea, stories and care.',
  lang: 'en',
  /** Month names, used where a date is shown as month and year only. */
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],

  nav: [
    { label: 'About', href: '/about' },
    { label: 'Our Work', href: '/our-work' },
    { label: 'Tea Talks', href: '/tea-talks' },
    { label: 'Mental Health', href: '/mental-health' },
    { label: 'Contact', href: '/contact' },
  ],
  footer: {
    safety: { label: 'Safety and Privacy', href: '/safety-and-privacy' },
  },
  skipLink: 'Skip to content',
  /** Page titles, after the site name. */
  titles: {
    home: 'Shai Collective',
    about: 'About',
    ourWork: 'Our Work',
    safety: 'Safety and Privacy',
    contact: 'Contact',
    mentalHealth: 'Mental Health',
    teaTalks: 'Tea Talks',
    stories: 'Tea Talks',
  },

  /** The anonymous writing page, /tea-talks. */
  teaTalks: {
    greeting: 'Come sit for a while.',
    heading: 'Our Anonymous Space',
    intro: 'We host an anonymous space called Tea Talks, where community members can share their thoughts, feelings, and experiences.',
    promise: {
      lead: 'Before you write, here is our promise to you:',
      lines: [
        'Nothing you write here can be traced back to you.',
        'We do not ask who you are.',
        'We do not keep anything that could tell us.',
      ],
    },
    below: [
      'To keep yourself safe, please leave out names, places, or details that could identify you.',
      'It is not a counseling service. It is simply a space for words to exist, and for others to read them and feel less alone. Everything is reviewed before it is shared. Nothing is published without care.',
    ],
    textareaLabel: 'Your story',
    /** Label of the hidden anti-spam field. Nobody sees it; it must not look like a real field to autofill. */
    honeypotLabel: 'Leave this empty',
    placeholder: 'Write here.',
    submit: 'Share this',
    errors: {
      empty: 'The cup is empty. Write a few words first, then share it.',
      long: 'That is longer than we can hold in one cup. Please shorten it a little and try again.',
      network: 'It didn’t go through. Your words are still here, try again in a moment.',
    },
  },

  /** The confirmation page, /thanks. Swap these two lines when the collective sends its own. */
  thanks: {
    heading: 'Thank you for trusting us with this.',
    again: 'Write another',
  },

  stories: {
    heading: 'Tea Talks',
    intro: 'Stories shared here, read with care.',
    langNote: 'Showing stories in English.',
    showAll: 'Show all.',
    empty: 'The first stories are on their way.',
    older: 'Older stories',
    newer: 'Newer stories',
    /** Screen-reader name of the older/newer navigation. */
    pagerLabel: 'Pages',
  },

  quickExit: {
    label: 'Leave quickly',
    hint: 'Press Esc twice, quickly, to leave for a weather page. Your text is cleared first.',
  },

  notFound: {
    heading: 'That page is not here.',
    body: 'Come back for a cup whenever you like.',
    back: 'Back to the collective',
  },

  error: {
    heading: 'Something went wrong on our side.',
    body: 'Nothing you wrote was saved. Please try again in a moment.',
  },

  crossSite: {
    heading: 'That could not be sent from here.',
    body: 'The form has to be sent from this site itself. Please open the page again and try once more.',
  },

  admin: {
    title: 'Moderation',
    chip: 'Team',
    /** Screen-reader name of the tab row. */
    navLabel: 'Moderation',
    loginHeading: 'Moderator sign-in',
    loginIntro: 'Sign in to read what is waiting.',
    loginHint: 'The passphrase is shared in person, never by message.',
    passwordLabel: 'Passphrase',
    loginButton: 'Sign in',
    loginFailed: 'That did not match. Try again.',
    loginNotConfigured: 'No passphrase has been set yet. Open the one-time setup link to choose one.',
    passphraseSet: 'The passphrase is set. Sign in with it.',
    passphraseChanged: 'The passphrase has been changed.',
    tabWaiting: 'Waiting',
    tabApproved: 'Approved',
    tabRejected: 'Rejected',
    tabMessages: 'Messages',
    pendingEmpty: 'Nothing is waiting. Enjoy your tea.',
    pendingEmptyBody: 'New stories will show up here as they arrive.',
    approvedEmpty: 'Nothing has been approved yet.',
    approvedEmptyBody: 'Stories you approve will be listed here.',
    rejectedEmpty: 'Nothing has been rejected.',
    rejectedEmptyBody: 'Stories you reject stay here until you restore or delete them.',
    messagesEmpty: 'No messages.',
    messagesEmptyBody: 'What people send through the contact page will show up here.',
    approve: 'Approve',
    reject: 'Reject',
    delete: 'Delete',
    unpublish: 'Unpublish',
    restore: 'Restore',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    editLabel: 'Edit the text',
    editNote: 'Saving replaces the text. The original is not kept anywhere.',
    replied: 'Replied',
    replyTo: 'Reply to',
    noReplyTo: 'No reply address was given.',
    confirmDeleteHeading: 'Delete this for good?',
    confirmDeleteYes: 'Yes, delete it',
    confirmDeleteNo: 'Keep it',
    receivedOn: 'Received',
    receivedToday: 'Received today',
    receivedYesterday: 'Received yesterday',
    logout: 'Log out',
    sessionNote: 'You are logged out automatically after 30 minutes without activity, and when you close the browser.',
    archiveOn: 'The public stories page is switched on. Approved stories appear at /stories.',
    archiveOff: 'The public stories page is switched off. Approving a story keeps it for later; nothing is shown publicly.',
    changePassphrase: 'Change passphrase',
    setup: {
      heading: 'Choose the moderator passphrase',
      intro: 'This link works once. Choose a passphrase of at least 16 characters and type it twice. It is never shown again, so keep it in a password manager.',
      newLabel: 'New passphrase',
      repeatLabel: 'Type it again',
      button: 'Set the passphrase',
      tooShort: 'At least 16 characters, please.',
      mismatch: 'The two do not match. Try again.',
      linkDead: 'This setup link has already been used or has expired.',
    },
    change: {
      heading: 'Change the passphrase',
      currentLabel: 'Current passphrase',
      newLabel: 'New passphrase',
      repeatLabel: 'Type it again',
      button: 'Change it',
      wrongCurrent: 'The current passphrase did not match.',
      back: 'Back to moderation',
      notInPreview: 'The passphrase cannot be changed in the preview.',
    },
  },

  /** Only used when DEMO_MODE=true (a temporary preview that stores nothing). */
  demo: {
    banner: "Preview. Nothing written here is saved. The final site will live on the collective's own server.",
    /** Three generic sample stories for the public page. */
    stories: [
      'There is a small café near where I live that opens early. I go before the city wakes up and drink one cup slowly. It is the only hour of the day that feels entirely mine.',
      'My grandmother taught me to let the tea steep for exactly three minutes. I still count them in my head when I am nervous. It works more often than it should.',
      'I wrote a letter I will never send. Writing it was enough. I am leaving a shorter version here, because putting it somewhere felt better than keeping it.',
    ],
    /** Two generic sample stories waiting in the moderation panel. */
    pending: [
      'Someone at the market gave me an extra orange today and said nothing. I have been thinking about it all afternoon. Small kindness is a language.',
      'I have started walking home the long way, past the river. Nothing happens on that walk. That is exactly why I take it.',
    ],
    /** One sample story in the rejected list. */
    rejected: [
      'A sample story that was set aside. It stays here until a moderator restores or deletes it.',
    ],
    /** Two sample contact messages. */
    messages: [
      { text: 'Thank you for the reading last month. I did not say a word, but I listened, and I came home lighter.', replyTo: 'a sample address' },
      { text: 'Is there a way to join the next circle? I would like to listen first.', replyTo: null },
    ],
  },
} as const;
