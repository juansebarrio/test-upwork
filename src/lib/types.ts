export type Status = 'pending' | 'approved' | 'rejected';

export interface Submission {
  id: string;
  text: string;
  status: Status;
  /** YYYY-MM-DD, UTC. */
  day: string;
  /** Language the page was in when the story was sent, e.g. 'en'. */
  lang: string;
}

export interface Message {
  id: string;
  text: string;
  /** Whatever the sender typed as a way to reply, or null. Erased on "Replied" or after 30 days. */
  reply_to: string | null;
  /** YYYY-MM-DD, UTC. */
  day: string;
}
