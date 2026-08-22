import { describe, expect, it } from 'vitest';
import { buildGroups, calculateStandings, computeGroupStandings, createDemoTournament, generateTournament, shuffle, validateGameScore } from './tournament';

describe('tournament logic', () => {
  it('shuffles players without mutating the original list', () => {
    const players = ['A', 'B', 'C', 'D'];
    const result = shuffle(players);
    expect(result).toHaveLength(players.length);
    expect(result).toEqual(expect.arrayContaining(players));
    expect(players).toEqual(['A', 'B', 'C', 'D']);
  });

  it('creates 3 groups for 12 players', () => {
    const players = Array.from({ length: 12 }, (_, index) => ({ id: `p-${index + 1}`, name: `Player ${index + 1}` }));
    const groups = buildGroups(players);
    expect(groups).toHaveLength(3);
    groups.forEach((group) => expect(group.playerIds.length).toBeGreaterThanOrEqual(3));
  });

  it('validates legal table tennis scoring', () => {
    expect(validateGameScore(11, 7)).toBe(true);
    expect(validateGameScore(11, 10)).toBe(false);
    expect(validateGameScore(12, 10)).toBe(true);
    expect(validateGameScore(15, 13)).toBe(true);
  });

  it('generates a round robin schedule across 3 groups', () => {
    const players = Array.from({ length: 12 }, (_, index) => ({ id: `p-${index + 1}`, name: `Player ${index + 1}` }));
    const tournament = generateTournament(players);
    expect(tournament.matches.length).toBeGreaterThan(0);
    expect(tournament.groups.length).toBe(3);
  });

  it('calculates standings from completed matches', () => {
    const players = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
    ];
    const matches = [
      {
        id: 'm1',
        tournamentId: 't1',
        stage: 'Group',
        player1Id: 'a',
        player2Id: 'b',
        status: 'Completed',
        winnerId: 'a',
        queueOrder: 1,
        createdAt: 'now',
        updatedAt: 'now',
        scores: [
          { matchId: 'm1', gameNumber: 1, player1Score: 11, player2Score: 8 },
          { matchId: 'm1', gameNumber: 2, player1Score: 11, player2Score: 6 },
        ],
      },
      {
        id: 'm2',
        tournamentId: 't1',
        stage: 'Group',
        player1Id: 'a',
        player2Id: 'c',
        status: 'Completed',
        winnerId: 'c',
        queueOrder: 2,
        createdAt: 'now',
        updatedAt: 'now',
        scores: [
          { matchId: 'm2', gameNumber: 1, player1Score: 11, player2Score: 9 },
          { matchId: 'm2', gameNumber: 2, player1Score: 11, player2Score: 7 },
        ],
      },
    ] as any;

    const standings = calculateStandings(matches, players);
    expect(standings[0].playerName).toBe('C');
    expect(standings[0].won).toBe(1);
  });

  it('groups standings by group and includes player rosters', () => {
    const players = [
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B' },
      { id: 'c', name: 'C' },
      { id: 'd', name: 'D' },
    ];
    const groups = [
      { id: 'g1', name: 'Group A', tournamentId: 't1', playerIds: ['a', 'b'] },
      { id: 'g2', name: 'Group B', tournamentId: 't1', playerIds: ['c', 'd'] },
    ];
    const matches = [
      {
        id: 'm1',
        tournamentId: 't1',
        stage: 'Group',
        groupId: 'g1',
        player1Id: 'a',
        player2Id: 'b',
        status: 'Completed',
        winnerId: 'a',
        queueOrder: 1,
        createdAt: 'now',
        updatedAt: 'now',
        scores: [
          { matchId: 'm1', gameNumber: 1, player1Score: 11, player2Score: 7 },
          { matchId: 'm1', gameNumber: 2, player1Score: 11, player2Score: 9 },
        ],
      },
    ] as any;

    const standings = computeGroupStandings(matches, players, groups);
    expect(standings.g1[0].playerName).toBe('A');
    expect(standings.g1[0].gamesWon).toBe(2);
    expect(standings.g1[1].gamesLost).toBe(2);
    expect(standings.g1[0].pointsFor).toBe(22);
    expect(standings.g1[0].pointsAgainst).toBe(16);
  });

  it('creates a demo tournament with 15 players', () => {
    const tournament = createDemoTournament();
    expect(tournament.players).toHaveLength(15);
    expect(tournament.matches.length).toBeGreaterThan(0);
  });
});
