/**
 * The collective's words for the six content pages, verbatim.
 * Same punctuation, same dashes, same paragraph breaks as the master document.
 * Edit here and nowhere else; no template may alter a line.
 */
export const home = {
  /** Three opening vignettes, set in the opener style. */
  vignettes: [
    "It is the slight nod that masculine-presenting women who don't even know each other exchange in Addis. A knowing look that is easy to miss unless you know to look for it.",
    "It is a partner's mother calling and asking you to pick up milk on your way home because her daughter is not answering her phone. Her mother lacks the language but she knows her daughter and you have a \"special\" friendship.",
    'It is meeting your first queer African at your first small gathering of LGBTQ+ people.',
  ],
  welcome: [
    'Welcome to the Shai Collective. We all know what home means to us. We are just giving it a name. It is a group of LBQ women, trans women, and non-binary people in Ethiopia reaching across the Horn of Africa. In a world that often shuns us and denies our existence, we came together to hold space for each other.',
    'The Shai Collective is the community we all needed. It is the spiced tea of our ancestors, familiar, comforting, and nourishing.',
  ],
  teaTalks: {
    heading: 'Tea Talks: An Anonymous Space',
    body: [
      'We host an anonymous space where community members can share their thoughts, feelings, and experiences without giving their name or any identifying information.',
      'Nothing you write here can be traced back to you. We do not ask who you are, and we do not keep anything that could tell us.',
      'It is not a counseling service. It is simply a space for words to exist, and for others to read them and feel less alone.',
    ],
    share: 'Share a story',
    read: 'Read the stories',
  },
  /** The one line in terracotta. Only on the Home page. */
  held: 'Pour yourself a cup. You are welcome here.',
  doors: [
    { label: 'Our work', href: '/our-work' },
    { label: 'Reach us', href: '/contact' },
  ],
} as const;

export const about = {
  nameHeading: 'Our Name',
  name: [
    'Our name comes from the word for tea. In Amharic, it is shai. In Tigrinya, shahi. In Somali, shaah. In Afar, shaahí. In Afaan Oromoo, shaayee. Tea is the one thing that brings people together across borders and languages. It is how we start conversations about who we are.',
  ],
  believeHeading: 'We believe',
  /** Rendered as rows with a hairline between them, no bullets. */
  believe: [
    'That our safety depends on each other.',
    'That caring for our minds is not weakness, but rather survival.',
    'That telling our stories is a form of resistance.',
    'That joy is not frivolous, it is rebellion.',
    'That chosen family is real, and it saves lives.',
  ],
  elseHeading: 'What Else Is Possible',
  else: [
    'We started with a handful of people who trusted each other enough to show up. Everything will grow the same way: someone will tell us what they need, and we will find a way to build it.',
    "We don't know exactly what comes next, but we know how we'll get there — by listening to our community first, and building slowly, carefully, in ways that keep people safe. Some of what we need, we can't say out loud yet. That, too, is part of protecting each other.",
  ],
} as const;

export const ourWork = {
  opener: 'Our work is rooted in two things: healing and storytelling.',
  storiesHeading: 'Stories',
  stories: [
    'There are almost no queer stories from the Horn of Africa. No literature, no films, limited number of podcasts. Our lives are erased from our own cultures, and that erasure is a kind of violence, slow and quiet, but real.',
    'We are doing something about it. We are working on our first anthology of short stories and recording our pilot podcast episode. We create short stories, poetry, audio dramas, and podcasts. Some may be inspired by real experiences, others imagined, but all of them reflect the truth of what it means to be us.',
    'We create because we need to see ourselves, because the next generation deserves to know that we existed, and because joy, imagination, and creativity are forms of survival.',
  ],
  /** Four door cards. The publishing system behind them is a later milestone. */
  doors: [
    { title: 'Magazine', line: 'Short stories, poetry and essays, written by us.' },
    { title: 'Podcast', line: 'Conversations and audio dramas, recorded with care.' },
    { title: 'Blog', line: 'Notes from the collective, posted when there is something to say.' },
    { title: 'Films', line: 'Short films, made slowly and shared discreetly.' },
  ],
  closing: "If you're someone who wants to support queer mental health, storytelling, or community building in the Horn of Africa, and you understand why we move carefully, we want to hear from you.",
  reach: 'Reach us',
} as const;

export const safety = {
  opening: [
    'We are careful, and we hope you understand.',
    'The safety of our community is at the center of everything we do. We create safely, with no names and no identifying details (unless requested), just stories that capture our lives without exposing anyone to risk.',
    'We never track users, store data, or try to find out who anyone is. The space is moderated to keep it safe, but your privacy is protected as we protect our own.',
  ],
  keepsHeading: 'What this site keeps',
  keeps: 'Three things, and only when you share a story: the words you wrote, whether they have been published, and the day they arrived. Not the time. Not where you wrote from. Not what you used to write.',
  neverHeading: 'What it never keeps',
  never: 'No addresses, no device details, no cookies, no accounts, no record of your visit. Nothing on this site loads from anywhere else, so no other company sees you here either.',
  leavingHeading: 'Leaving quickly',
  leaving: 'Every page has a "Leave quickly" button at the top, and pressing Escape twice does the same. It clears what you were writing and replaces this page with an ordinary site, so pressing Back will not bring you here.',
  controlHeading: 'What we cannot control',
  control: 'Your own phone or computer, which keeps its own history. Your internet provider, which can see that you visited this site, though not what you wrote. The company that hosts the site, which keeps its own network records that we cannot see or delete. And the words you choose to write, so please leave out anything that could identify you or someone else.',
  publicHeading: 'Two things that are public',
  public: 'When a site like this goes online, its name appears in public records of security certificates, permanently, so anyone can see that this site has existed since a certain date. And the hosting company keeps its own records outside our reach. We chose where the site lives for its privacy laws; that is protection, not invisibility.',
} as const;

export const contact = {
  intro: 'If you want to reach us, the safest way is right here. What you write below reaches us and nothing else does: not your address, not your device, not where you are.',
  messageLabel: 'Your message',
  replyLabel: 'How can we reply to you? (optional)',
  replyHelp: 'Deleted once we have replied.',
  reminder: 'Please leave out names, places, or details that could identify you or others.',
  send: 'Send',
  /** Shown only when CONTACT_EMAIL is set. */
  emailLead: 'If you would rather write from your own email:',
  emailHelp: 'An email carries your address and your provider’s records. The form above carries only your words.',
  errorEmpty: 'Write a few words first, then press Send.',
  errorLong: 'That is longer than we can hold in one message. Please shorten it a little and try again.',
  sent: {
    body: 'Thank you. We will reply discreetly and protect your privacy as we protect our own.',
    back: 'Back to the collective',
  },
} as const;

export const mentalHealth = {
  heading: 'Healing',
  opening: [
    'We know what it is to live with fear and to carry anxiety that never quite leaves. As queer people, the work we do did not start with the Shai Collective. It started with the relationships we built, the trust we earned, and the lessons we learned along the way. We bring all of that with us, not as something we own, but as something we continue.',
  ],
  circlesHeading: 'Circles',
  circles: [
    'As queer people, we have sat in circles with others who had been through things no one should have to go through. We have talked, listened, and started to heal. Homophobia and transphobia touch every part of our lives. A safe and supportive environment is a basic human need. We have thus partnered with a queer-friendly, trauma-informed psychotherapist who guides our small group therapy sessions. We are invested in developing a team of peer counselors from the queer community that focuses on emotional support, trauma healing, coping strategies, and community building.',
  ],
  resourcesHeading: 'Resources',
  resources: [
    'We also create resources: guides on mental health that speak to our lives, information on sexual and reproductive health that does not judge us, toolkits so individuals can start their own circles, and audio and video that can be accessed discreetly. We offer something small but profound: a place to breathe and a reminder that we are not alone.',
  ],
  /** Plain rows, no arrow or link until there is a page behind them. */
  rows: ['Guides', 'Start your own circle', 'Listen and watch'],
} as const;
