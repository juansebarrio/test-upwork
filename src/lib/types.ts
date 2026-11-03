export type Status = 'pending' | 'approved';

export interface Submission {
  id: string;
  text: string;
  status: Status;
  /** YYYY-MM-DD, UTC. */
  day: string;
}
