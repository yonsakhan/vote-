import { Poll, PollOption } from './types';

// In-memory store (resets on cold start in serverless)
// For production, use Vercel KV or a database
const polls = new Map<string, Poll>();

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export function createPoll(
  title: string,
  description: string,
  optionTexts: string[],
  multiSelect: boolean,
  deadline: string | null
): Poll {
  const id = generateId();
  const options: PollOption[] = optionTexts.map((text, i) => ({
    id: `opt_${id}_${i}`,
    text,
    votes: 0,
  }));

  const poll: Poll = {
    id,
    title,
    description,
    options,
    multiSelect,
    deadline,
    createdAt: new Date().toISOString(),
    totalVotes: 0,
  };

  polls.set(id, poll);
  return poll;
}

export function getPoll(id: string): Poll | undefined {
  return polls.get(id);
}

export function getAllPolls(): Poll[] {
  return Array.from(polls.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function deletePoll(id: string): boolean {
  return polls.delete(id);
}

export function vote(pollId: string, optionIds: string[]): Poll | null {
  const poll = polls.get(pollId);
  if (!poll) return null;

  // Check deadline
  if (poll.deadline && new Date(poll.deadline) < new Date()) {
    return null;
  }

  for (const optId of optionIds) {
    const option = poll.options.find((o) => o.id === optId);
    if (option) {
      option.votes += 1;
    }
  }
  poll.totalVotes += 1;
  return poll;
}

// Seed some demo polls
createPoll(
  '你最喜欢的编程语言是什么？',
  '选出你日常使用最多的编程语言',
  ['TypeScript', 'Python', 'Rust', 'Go', 'Java'],
  false,
  null
);

createPoll(
  '下次团建去哪里？',
  '投票决定下次团队建设活动的目的地',
  ['三亚', '成都', '杭州', '大理'],
  false,
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
);
