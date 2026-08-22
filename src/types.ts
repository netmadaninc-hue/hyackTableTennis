export type MatchStatus = 'Upcoming' | 'Ready' | 'In Progress' | 'Completed' | 'Postponed';
export type Stage = 'Group' | 'Quarterfinal' | 'Semifinal' | 'Final' | 'Third Place';

export interface Player {
  id: string;
  name: string;
  groupId?: string;
  seed?: number;
}

export interface Match {
  id: string;
  tournamentId: string;
  stage: Stage;
  groupId?: string;
  player1Id: string | null;
  player2Id: string | null;
  tableNumber?: number;
  status: MatchStatus;
  queueOrder: number;
  winnerId?: string | null;
  scheduledTime?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  scores?: GameScore[];
}

export interface GameScore {
  id?: string;
  matchId: string;
  gameNumber: number;
  player1Score: number;
  player2Score: number;
}

export interface Group {
  id: string;
  name: string;
  tournamentId: string;
  playerIds: string[];
}

export interface TournamentSettings {
  name: string;
  startTime: string;
  endTime: string;
  tables: number;
  matchFormat: 'Best of 3 games';
  gameFormat: 'First to 11';
  matchDurationMinutes: number;
}

export interface StandingsEntry {
  playerId: string;
  playerName: string;
  played: number;
  won: number;
  lost: number;
  gamesWon: number;
  pointsFor: number;
  pointsAgainst: number;
  gameDifference: number;
  pointDifference: number;
  qualificationStatus: 'Qualified' | 'Still competing' | 'Eliminated' | 'Waiting';
}

export interface TournamentData {
  settings: TournamentSettings;
  players: Player[];
  groups: Group[];
  matches: Match[];
}
