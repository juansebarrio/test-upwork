/**
 * Every word a visitor or moderator can read lives in this file.
 * Edit freely. Keep the tone warm and unhurried. No other file contains copy.
 *
 * Text may contain plain characters only (no HTML). Line breaks in
 * multi-paragraph fields are written as arrays, one paragraph per item.
 */
export const copy = {
  siteName: 'Tea Talks',
  collective: 'Shai Collective',
  lang: 'en',

  home: {
    title: 'Tea Talks',
    greeting: 'Come, sit. The kettle is on.',
    intro: [
      'This is a quiet place to put down something you have been carrying. A memory, a worry, a small joy, a thing you have never said out loud.',
      'Nothing here asks who you are. We do not know, and we have built it so that we cannot find out.',
    ],
    textareaLabel: 'Your story',
    /** One line shown just above the box. */
    reminder: 'A gentle reminder: please leave out names, places or details that could point to you or to someone else.',
    placeholder: 'Take your time. Write as much or as little as you like.',
    submit: 'Pass it to us',
    afterSubmitNote: 'A person from the collective reads every story before anything is shared.',
    errors: {
      empty: 'The cup is empty. Write a few words first, then pass it to us.',
      long: 'That is longer than we can hold in one cup. Please shorten it a little and try again.',
    },
  },

  thanks: {
    title: 'Thank you',
    heading: 'Thank you. It has been received.',
    body: [
      'Your words are with us now. Someone from the collective will read them with care.',
      'We keep only the text and the day it arrived. Nothing else was collected, so there is nothing to trace back to you.',
    ],
    again: 'Share another',
    leave: 'Leave this page',
  },

  stories: {
    title: 'Stories',
    heading: 'Stories shared over tea',
    intro: 'Words from people in our community, shared as they were given. Newest first.',
    empty: 'Nothing has been shared here yet. Come back another day.',
    backHome: 'Share your own',
  },

  quickExit: {
    label: 'Leave quickly',
    hint: 'Press Esc twice, quickly, to leave for a weather page. Your text is cleared first.',
  },

  notFound: {
    title: 'Not here',
    heading: 'There is nothing on this page.',
    body: 'Perhaps the link was mistyped. The kettle is still on at the front door.',
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
    loginHeading: 'Moderator sign-in',
    passwordLabel: 'Password',
    loginButton: 'Sign in',
    loginFailed: 'That did not match. Try again.',
    loginNotConfigured: 'The moderator password has not been set on the server yet.',
    pendingHeading: 'Waiting to be read',
    pendingEmpty: 'Nothing is waiting. Enjoy your tea.',
    approvedHeading: 'Approved',
    approvedEmpty: 'Nothing has been approved yet.',
    approve: 'Approve',
    delete: 'Delete',
    confirmDeleteHeading: 'Delete this story for good?',
    confirmDeleteBody: 'It will be removed from the database immediately. There is no undo and no recycle bin.',
    confirmDeleteYes: 'Yes, delete it',
    confirmDeleteNo: 'Keep it',
    receivedOn: 'Received',
    logout: 'Log out',
    sessionNote: 'You are logged out automatically after 30 minutes without activity, and when you close the browser.',
    archiveOn: 'The public archive is switched on. Approved stories appear at /stories.',
    archiveOff: 'The public archive is switched off. Approving a story keeps it for later; nothing is shown publicly.',
  },

  footer: {
    line: 'Made with care by Shai Collective.',
  },
} as const;
