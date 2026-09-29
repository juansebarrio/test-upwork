/**
 * Every word a visitor or moderator can read lives in this file.
 * Edit freely. Keep the tone warm and unhurried. No other file contains copy.
 *
 * Text may contain plain characters only (no HTML). Multi-paragraph fields
 * are arrays, one paragraph per item.
 *
 * A few keys are not rendered by the current layout (for example
 * home.afterSubmitNote, thanks.leave, stories.backHome, admin.confirmDeleteBody,
 * footer.line). They are kept so earlier wording is not lost.
 */
export const copy = {
  siteName: 'Tea Talks',
  /** Generic on purpose: it is what search engines and link previews would show. */
  siteDescription: 'A quiet place to share a story over tea.',
  collective: 'Shai Collective',
  lang: 'en',
  /** Month names, used where a date is shown as month and year only. */
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],

  home: {
    title: 'Tea Talks',
    greeting: 'Come sit for a while.',
    intro: [
      'This is a place to put down something you have been carrying. A story, a thought, a moment. Whatever you want to share, over tea.',
    ],
    /** Three short lines shown just above the box. */
    trust: [
      'Nothing you write here can be traced back to you. We do not ask who you are, and we do not keep anything that could tell us.',
      'What you share may be read by others in the community, always without your name or anything that could point to you. We read everything before it is shared.',
      'To keep yourself safe, try to leave out names, places or details that could identify you.',
    ],
    textareaLabel: 'Your story',
    /** Label of the hidden anti-spam field. Nobody sees it; it must not look like a real field to autofill. */
    honeypotLabel: 'Leave this empty',
    placeholder: 'Take your time. Write as much or as little as you like.',
    submit: 'Share this',
    afterSubmitNote: 'A person from the collective reads every story before anything is shared.',
    errors: {
      empty: 'The cup is empty. Write a few words first, then pass it to us.',
      long: 'That is longer than we can hold in one cup. Please shorten it a little and try again.',
      network: 'It didn’t go through. Your words are still here, try again in a moment.',
    },
  },

  thanks: {
    title: 'Thank you',
    heading: 'Thank you for trusting us with this.',
    body: [
      'Someone from the collective will read it with care. If it is shared, it will be without your name or anything that could identify you. There is nothing more you need to do.',
    ],
    again: 'Write another',
    leave: 'Leave this page',
  },

  stories: {
    title: 'Tea Talks',
    heading: 'Tea Talks',
    intro: 'Stories shared by people in our community, in their own words. Each one was read with care before it was placed here.',
    empty: 'The first stories are on their way.',
    backHome: 'Share your own',
    older: 'Older stories',
    newer: 'Newer stories',
    /** Screen-reader name of the older/newer navigation. */
    pagerLabel: 'Pages',
  },

  quickExit: {
    label: 'Leave quickly',
    ariaLabel: 'Leave this page quickly',
    hint: 'Press Esc twice, quickly, to leave for a weather page. Your text is cleared first.',
  },

  notFound: {
    title: 'Not here',
    heading: 'That page is not here.',
    body: 'Come back for a cup whenever you like.',
    backHome: 'Go to the front page',
  },

  error: {
    title: 'Something went wrong',
    heading: 'Something went wrong on our side.',
    body: 'Nothing you wrote was saved. Please try again in a moment.',
  },

  crossSite: {
    title: 'Could not send',
    heading: 'That could not be sent from here.',
    body: 'The form has to be sent from the Tea Talks page itself. Please open the front page and try again.',
  },

  admin: {
    title: 'Moderation',
    chip: 'Team',
    /** Screen-reader name of the tab row. */
    navLabel: 'Moderation',
    loginHeading: 'Moderator sign-in',
    loginIntro: 'Sign in to read what is waiting.',
    loginHint: 'The password is shared in person, never by message.',
    passwordLabel: 'Password',
    loginButton: 'Sign in',
    loginFailed: 'That did not match. Try again.',
    loginNotConfigured: 'The moderator password has not been set on the server yet.',
    tabWaiting: 'Waiting',
    tabApproved: 'Approved',
    pendingHeading: 'Waiting to be read',
    pendingEmpty: 'Nothing is waiting. Enjoy your tea.',
    pendingEmptyBody: 'New stories will show up here as they arrive.',
    approvedHeading: 'Approved',
    approvedEmpty: 'Nothing has been approved yet.',
    approvedEmptyBody: 'Stories you approve will be listed here.',
    approve: 'Approve',
    delete: 'Delete',
    unpublish: 'Unpublish',
    confirmDeleteHeading: 'Delete this story for good?',
    confirmDeleteBody: 'It will be removed from the database immediately. There is no undo and no recycle bin.',
    confirmDeleteYes: 'Yes, delete it',
    confirmDeleteNo: 'Keep it',
    receivedOn: 'Received',
    receivedToday: 'Received today',
    receivedYesterday: 'Received yesterday',
    logout: 'Log out',
    sessionNote: 'You are logged out automatically after 30 minutes without activity, and when you close the browser.',
    archiveOn: 'The public archive is switched on. Approved stories appear at /stories.',
    archiveOff: 'The public archive is switched off. Approving a story keeps it for later; nothing is shown publicly.',
  },

  footer: {
    line: 'Made with care by Shai Collective.',
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
  },
} as const;
