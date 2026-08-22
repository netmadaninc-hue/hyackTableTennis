import type { Group, Match, MatchStatus, Player, Stage, StandingsEntry, TournamentData } from '../types';

export const DEFAULT_SETTINGS = {
  name: 'Hyack Table Tennis Open',
  startTime: '2026-08-22T16:15:00',
  endTime: '2026-08-22T18:00:00',
  tables: 3,
  matchFormat: 'Best of 3 games',
  gameFormat: 'First to 11',
  matchDurationMinutes: 7,
} as const;

export function shuffle<T>(items: T[]): T[] {
  const array = [...items];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function buildGroups(players: Player[]): Group[] {
  const shuffled = shuffle(players);
  const count = shuffled.length;
  const targetGroupSizes = [4, 4, 4, 3];
  const groupCount = Math.min(4, Math.ceil(count / 3));
  const groups: Group[] = [];

  for (let i = 0; i < groupCount; i += 1) {
    const groupPlayers = shuffled.slice(
      i * Math.ceil(count / groupCount),
      (i + 1) * Math.ceil(count / groupCount),
    );

    groups.push({
      id: `group-${i + 1}`,
      name: `Group ${i + 1}`,
      tournamentId: 'demo',
      playerIds: groupPlayers.map((player) => player.id),
    });
  }

  if (count <= 15) {
    const normalized = (() => {
      const sizes = [0, 0, 0, 0];
      let index = 0;
      for (const player of shuffled) {
        sizes[index % 4] += 1;
        index += 1;
      }
      return sizes;
    })();

    for (let i = 0; i < groups.length; i += 1) {
      groups[i].playerIds = shuffled
        .filter((_, playerIndex) => playerIndex % groups.length === i)
        .map((player) => player.id);
      if (normalized[i] === 0) {
        groups[i].playerIds = [];
      }
    }
  }

  return groups.filter((group) => group.playerIds.length > 0);
}

export function roundRobinMatches(group: Group, players: Player[], stage: Stage = 'Group'): Match[] {
  const ids = group.playerIds.map((id) => players.find((player) => player.id === id)?.id).filter(Boolean) as string[];
  const matches: Match[] = [];

  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      matches.push({
        id: `${group.id}-${i}-${j}`,
        tournamentId: 'demo',
        stage,
        groupId: group.id,
        player1Id: ids[i],
        player2Id: ids[j],
        status: 'Upcoming',
        queueOrder: matches.length + 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return matches;
}

export function generateTournament(players: Player[]): TournamentData {
  const safePlayers = players.map((player, index) => ({ ...player, id: player.id || `player-${index + 1}` }));
  const groups = buildGroups(safePlayers);
  const matches: Match[] = [];

  groups.forEach((group) => {
    const groupMatches = roundRobinMatches(group, safePlayers, 'Group');
    matches.push(...groupMatches);
  });

  return {
    settings: { ...DEFAULT_SETTINGS },
    players: safePlayers,
    groups,
    matches,
  };
}

export function validateGameScore(scoreA: number, scoreB: number): boolean {
  if (scoreA < 0 || scoreB < 0) return false;
  const maxScore = Math.max(scoreA, scoreB);
  const minScore = Math.min(scoreA, scoreB);

  if (maxScore < 11) return false;
  if (maxScore === 11) return minScore <= 9;
  return maxScore - minScore >= 2;
}

export function calculateStandings(matches: Match[], players: Player[]): StandingsEntry[] {
  const stats = new Map<string, StandingsEntry>();

  players.forEach((player) => {
    stats.set(player.id, {
      playerId: player.id,
      playerName: player.name,
      played: 0,
      won: 0,
      lost: 0,
      gameDifference: 0,
      pointDifference: 0,
      qualificationStatus: 'Still competing',
    });
  });

  matches.forEach((match) => {
    if (match.status !== 'Completed' || !match.winnerId) return;
    const player1 = stats.get(match.player1Id ?? '');
    const player2 = stats.get(match.player2Id ?? '');
    if (!player1 || !player2) return;

    const winner = match.winnerId === match.player1Id ? player1 : player2;
    const loser = match.winnerId === match.player1Id ? player2 : player1;
    winner.played += 1;
    winner.won += 1;
    loser.played += 1;
    loser.lost += 1;

    const scores = match.scores ?? [];
    scores.forEach((score) => {
      const p1 = score.player1Score;
      const p2 = score.player2Score;
      const p1Won = p1 > p2;
      const p2Won = p2 > p1;

      if (p1Won) {
        player1.gameDifference += 1;
        player2.gameDifference -= 1;
      }
      if (p2Won) {
        player2.gameDifference += 1;
        player1.gameDifference -= 1;
      }

      player1.pointDifference += p1 - p2;
      player2.pointDifference += p2 - p1;
    });
  });

  return Array.from(stats.values()).sort((a, b) => {
    if (b.won !== a.won) return b.won - a.won;
    if (a.lost !== b.lost) return a.lost - b.lost;
    if (b.gameDifference !== a.gameDifference) return b.gameDifference - a.gameDifference;
    return b.pointDifference - a.pointDifference;
  });
}

export function createDemoTournament(): TournamentData {
  const players: Player[] = ['Ravi Kumar', 'John Smith', 'David Lee', 'Alex Chen', 'Sam Brown', 'Mike Turner', 'Chris Wang', 'Paul Nguyen', 'Daniel Kim', 'Leo Park', 'Nate Ross', 'Omar Hassan', 'Zane Cole', 'Ethan Hall', 'Noah Bell'].map((name, index) => ({
    id: `player-${index + 1}`,
    name,
  }));

  return generateTournament(players);
}
