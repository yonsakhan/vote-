export interface PollOption {
  id: string;
  text: string;
  votes: number;
}

export interface Poll {
  id: string;
  title: string;
  description: string;
  options: PollOption[];
  multiSelect: boolean;
  deadline: string | null; // ISO string
  createdAt: string;
  totalVotes: number;
  tags?: string[];
  ownerId?: string | null;
}

export interface CreatePollRequest {
  title: string;
  description: string;
  options: string[];
  multiSelect: boolean;
  deadline: string | null;
}

export interface VoteRequest {
  optionIds: string[];
}

export interface ApiErrorResponse {
  error: string;
}

export type PollStatus = 'ongoing' | 'ended';

export interface PollListQuery {
  q?: string;
  status?: 'all' | PollStatus;
  sort?: 'new' | 'hot';
  page?: number;
  pageSize?: number;
  ids?: string[];
}

export interface PollListMeta {
  total: number;
  page: number;
  pageSize: number;
}

export interface GetPollsResponse {
  polls: Poll[];
  meta: PollListMeta;
}

export interface GetPollResponse {
  poll: Poll;
}

export interface CreatePollResponse {
  poll: Poll;
}

export interface VoteResponse {
  poll: Poll;
}

export interface DeletePollResponse {
  ok: true;
}
