import type { Group, Match, MatchStatus, Player, Stage, StandingsEntry, TournamentData } from '../types';

export type GroupStandingsMap = Record<string, StandingsEntry[]>;

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
  const groupCount = 3;
  const groups: Group[] = Array.from({ length: groupCount }, (_, index) => ({
    id: `group-${index + 1}`,
    name: `Group ${index + 1}`,
    tournamentId: 'demo',
    playerIds: [],
  }));

  shuffled.forEach((player, index) => {
    groups[index % groupCount].playerIds.push(player.id);
  });

  return groups;
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

  const groupTableMap: Record<string, number> = {};
  groups.forEach((group, index) => {
    groupTableMap[group.id] = index + 1;
    const groupMatches = roundRobinMatches(group, safePlayers, 'Group');
    groupMatches.forEach((match) => {
      match.tableNumber = groupTableMap[group.id];
      match.status = 'Upcoming';
    });
    matches.push(...groupMatches);
  });

  const firstMatches = matches.filter((_, index) => index < groups.length);
  firstMatches.forEach((match) => {
    match.status = 'Ready';
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

export function computeGroupStandings(matches: Match[], players: Player[], groups: Group[]): GroupStandingsMap {
  const playerMap = new Map(players.map((player) => [player.id, player]));
  const standingsByGroup: GroupStandingsMap = {};

  groups.forEach((group) => {
    const stats = new Map<string, StandingsEntry>();

    group.playerIds.forEach((playerId) => {
      const player = playerMap.get(playerId);
      if (!player) return;

      stats.set(player.id, {
        playerId: player.id,
        playerName: player.name,
        played: 0,
        won: 0,
        lost: 0,
        gamesWon: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        gameDifference: 0,
        pointDifference: 0,
        qualificationStatus: 'Still competing',
      });
    });

    matches.forEach((match) => {
      if (match.groupId !== group.id || match.status !== 'Completed' || !match.winnerId) return;
      const p1 = stats.get(match.player1Id ?? '');
      const p2 = stats.get(match.player2Id ?? '');
      if (!p1 || !p2) return;

      const winner = match.winnerId === match.player1Id ? p1 : p2;
      const loser = match.winnerId === match.player1Id ? p2 : p1;
      winner.played += 1;
      winner.won += 1;
      loser.played += 1;
      loser.lost += 1;

      const scores = match.scores ?? [];
      scores.forEach((score) => {
        const p1Score = score.player1Score;
        const p2Score = score.player2Score;

        if (p1Score > p2Score) {
          p1.gamesWon += 1;
          p1.pointsFor += p1Score;
          p1.pointsAgainst += p2Score;
          p1.pointDifference += p1Score - p2Score;
          p1.gameDifference += 1;

          p2.gamesWon += 0;
          p2.pointsFor += p2Score;
          p2.pointsAgainst += p1Score;
          p2.pointDifference += p2Score - p1Score;
          p2.gameDifference -= 1;
        } else {
          p2.gamesWon += 1;
          p2.pointsFor += p2Score;
          p2.pointsAgainst += p1Score;
          p2.pointDifference += p2Score - p1Score;
          p2.gameDifference += 1;

          p1.pointsFor += p1Score;
          p1.pointsAgainst += p2Score;
          p1.pointDifference += p1Score - p2Score;
          p1.gameDifference -= 1;
        }
      });
    });

    standingsByGroup[group.id] = Array.from(stats.values()).sort((a, b) => {
      if (b.won !== a.won) return b.won - a.won;
      if (a.lost !== b.lost) return a.lost - b.lost;
      if (b.gameDifference !== a.gameDifference) return b.gameDifference - a.gameDifference;
      return b.pointDifference - a.pointDifference;
    });
  });

  return standingsByGroup;
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
      gamesWon: 0,
      pointsFor: 0,
      pointsAgainst: 0,
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
        player1.gamesWon += 1;
        player1.pointsFor += p1;
        player1.pointsAgainst += p2;
        player1.gameDifference += 1;
        player2.gamesWon += 0;
        player2.pointsFor += p2;
        player2.pointsAgainst += p1;
        player2.gameDifference -= 1;
      }
      if (p2Won) {
        player2.gamesWon += 1;
        player2.pointsFor += p2;
        player2.pointsAgainst += p1;
        player2.gameDifference += 1;
        player1.pointsFor += p1;
        player1.pointsAgainst += p2;
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
