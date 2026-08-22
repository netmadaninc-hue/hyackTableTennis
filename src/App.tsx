import { useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { DEFAULT_SETTINGS, computeGroupStandings, generateTournament, validateGameScore } from './lib/tournament';
import { useLocalStorage } from './lib/localStorage';
import type { Match, Player, TournamentData } from './types';

const STORAGE_KEY = 'hyack-table-tennis-data';
const AUTH_KEY = 'hyack-table-tennis-admin';

const emptyTournament: TournamentData = {
  settings: { ...DEFAULT_SETTINGS },
  players: [],
  groups: [],
  matches: [],
};

const blankGameScores: Array<{ player1: number | ''; player2: number | '' }> = [
  { player1: '', player2: '' },
  { player1: '', player2: '' },
  { player1: '', player2: '' },
];

function App() {
  const [tournament, setTournament] = useLocalStorage<TournamentData>(STORAGE_KEY, emptyTournament);
  const [adminLoggedIn, setAdminLoggedIn] = useLocalStorage<boolean>(AUTH_KEY, false);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Hyack Tournament</p>
          <h1>{tournament.settings.name}</h1>
        </div>
        <div className="status-pill">
          {adminLoggedIn ? 'Admin online' : 'Live view'}
        </div>
      </header>

      <nav className="nav-bar" aria-label="Primary navigation">
        <NavLink to="/" end>Live</NavLink>
        <NavLink to="/rankings">Standings</NavLink>
        <NavLink to="/bracket">Bracket</NavLink>
        <NavLink to="/rules">Rules</NavLink>
        <NavLink to="/admin">Admin</NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<LiveDashboard tournament={tournament} />} />
        <Route path="/rankings" element={<RankingsPage tournament={tournament} />} />
        <Route path="/bracket" element={<BracketPage tournament={tournament} />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/admin" element={<AdminPage tournament={tournament} setTournament={setTournament} adminLoggedIn={adminLoggedIn} setAdminLoggedIn={setAdminLoggedIn} />} />
      </Routes>

      <footer className="footer-bar">
        <span>⏱ {tournament.settings.startTime.slice(11, 16)}–{tournament.settings.endTime.slice(11, 16)}</span>
        <span>📍 {tournament.settings.tables} tables</span>
        <span>🏓 {tournament.players.length} players</span>
      </footer>
    </div>
  );
}

function LiveDashboard({ tournament }: { tournament: TournamentData }) {
  const nextMatches = tournament.matches
    .filter((match) => match.status === 'Upcoming')
    .sort((a, b) => (a.tableNumber ?? 99) - (b.tableNumber ?? 99))
    .slice(0, 4);
  const playerMap = new Map(tournament.players.map((player) => [player.id, player.name]));

  const resolveTableNumber = (tableNumber: number | undefined, fallbackIndex: number) => {
    const maxTable = tournament.settings.tables;
    const normalized = tableNumber && tableNumber > 0 ? tableNumber : fallbackIndex + 1;
    return Math.min(Math.max(normalized, 1), maxTable);
  };

  return (
    <main className="page">
      <section className="hero-card">
        <p className="eyebrow">Tournament status</p>
        <h2>{tournament.settings.name}</h2>
        <div className="status-row">
          <span className="status live">🟢 Live</span>
          <span>{tournament.matches.filter((match) => match.status === 'Completed').length} completed</span>
        </div>
      </section>

      <section>
        <h3>🏓 Playing now</h3>
        <div className="table-grid">
          {Array.from({ length: tournament.settings.tables }, (_, index) => {
            const match = tournament.matches.find((item) => (
              item.tableNumber === index + 1
              && (item.status === 'In Progress' || item.status === 'Ready')
            ));
            const p1 = match?.player1Id ? playerMap.get(match.player1Id) : 'TBD';
            const p2 = match?.player2Id ? playerMap.get(match.player2Id) : 'TBD';

            return (
              <article key={index + 1} className="match-card big">
                <div className="table-label">Table {index + 1}</div>
                <div className="versus">
                  <strong>{p1}</strong>
                  <span>VS</span>
                  <strong>{p2}</strong>
                </div>
                <div className="status-dot">{match ? (match.status === 'In Progress' ? '● IN PROGRESS' : '● READY') : '● OPEN'}</div>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <h3>⏭️ Up next</h3>
        <div className="stack-list">
          {nextMatches.map((match, index) => (
            <article key={match.id} className="list-card">
              <div>
                <strong>{playerMap.get(match.player1Id ?? '') ?? 'TBD'}</strong>
                <span> vs </span>
                <strong>{playerMap.get(match.player2Id ?? '') ?? 'TBD'}</strong>
              </div>
              <small>Table {resolveTableNumber(match.tableNumber, index)} • Queue {match.queueOrder}</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function RankingsPage({ tournament }: { tournament: TournamentData }) {
  const standingsByGroup = computeGroupStandings(tournament.matches, tournament.players, tournament.groups);

  return (
    <main className="page">
      <h3>Group standings</h3>
      <div className="group-standings-wrapper">
        {tournament.groups.map((group) => {
          const entries = standingsByGroup[group.id] ?? [];
          return (
            <section key={group.id} className="group-panel">
              <div className="group-header">
                <h4>{group.name}</h4>
                <div className="group-members">
                  {group.playerIds.map((playerId) => (
                    <span key={playerId} className="member-pill">
                      {tournament.players.find((player) => player.id === playerId)?.name ?? 'Unknown'}
                    </span>
                  ))}
                </div>
              </div>

              <div className="standings-list">
                {entries.length === 0 ? (
                  <p className="note">No results yet.</p>
                ) : entries.map((entry, index) => (
                  <article key={entry.playerId} className="standing-card">
                    <div className="rank-badge">#{index + 1}</div>
                    <div className="standing-main">
                      <strong>{entry.playerName}</strong>
                      <small>P {entry.played} • W {entry.won} • L {entry.lost}</small>
                    </div>
                    <div className="score-mini">
                      <span>Games won: {entry.gamesWon}</span>
                      <span>Points: {entry.pointsFor} - {entry.pointsAgainst}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function BracketPage({ tournament }: { tournament: TournamentData }) {
  const playerMap = new Map(tournament.players.map((player) => [player.id, player.name]));
  const semifinalEntries = [
    { id: 'sf1', label: 'Quarterfinal 1', players: [playerMap.get(tournament.players[0]?.id ?? '') ?? 'TBD', playerMap.get(tournament.players[1]?.id ?? '') ?? 'TBD'] },
    { id: 'sf2', label: 'Quarterfinal 2', players: [playerMap.get(tournament.players[2]?.id ?? '') ?? 'TBD', playerMap.get(tournament.players[3]?.id ?? '') ?? 'TBD'] },
    { id: 'sf3', label: 'Quarterfinal 3', players: [playerMap.get(tournament.players[4]?.id ?? '') ?? 'TBD', playerMap.get(tournament.players[5]?.id ?? '') ?? 'TBD'] },
    { id: 'sf4', label: 'Quarterfinal 4', players: [playerMap.get(tournament.players[6]?.id ?? '') ?? 'TBD', playerMap.get(tournament.players[7]?.id ?? '') ?? 'TBD'] },
  ];

  return (
    <main className="page">
      <h3>Knockout bracket</h3>
      <div className="bracket-list">
        {semifinalEntries.map((match) => (
          <article key={match.id} className="match-card">
            <small>{match.label}</small>
            <div>{match.players[0]} vs {match.players[1]}</div>
          </article>
        ))}
      </div>
      <div className="champion-box">
        <div>🥇 Champion: {playerMap.get(tournament.players[0]?.id ?? '') ?? 'TBD'}</div>
        <div>🥈 Runner-up: {playerMap.get(tournament.players[1]?.id ?? '') ?? 'TBD'}</div>
        <div>🥉 Third place: {playerMap.get(tournament.players[2]?.id ?? '') ?? 'TBD'}</div>
      </div>
    </main>
  );
}

function RulesPage() {
  const rules = [
    '🎯 Best of 3 games',
    '🔢 First to 11, win by 2',
    '🔄 2 serves each',
    '🔁 At 10–10, alternate serve every point',
    '🕸️ Serve hits net and lands correctly → Replay',
    '🕸️ Rally hits net → Play continues',
    '✅ Top edge → IN',
    '❌ Vertical side → OUT',
    '✋ Free hand touches table during rally → Lose point',
    '🏓 Racket hand → Legal',
    '🚫 Moving the table → Lose point',
    '🚫 Hitting ball before it bounces → Lose point',
    '⚖️ Organizer/referee decision is final',
  ];

  return (
    <main className="page">
      <h3>🏓 Important rules</h3>
      <ul className="rules-list">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </main>
  );
}

function AdminPage({ tournament, setTournament, adminLoggedIn, setAdminLoggedIn }: { tournament: TournamentData; setTournament: (value: TournamentData | ((current: TournamentData) => TournamentData)) => void; adminLoggedIn: boolean; setAdminLoggedIn: (value: boolean) => void; }) {
  const [email, setEmail] = useState('admin@hyack.example');
  const [password, setPassword] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [selectedMatchId, setSelectedMatchId] = useState(tournament.matches[0]?.id ?? '');
  const [gameScores, setGameScores] = useState<Array<{ player1: number | ''; player2: number | '' }>>(blankGameScores);
  const [scoreMessage, setScoreMessage] = useState('');

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    if (email && password === 'nimda') {
      setAdminLoggedIn(true);
    }
  };

  const addPlayer = () => {
    if (!playerName.trim()) return;
    const name = playerName.trim();
    if (tournament.players.some((player) => player.name.toLowerCase() === name.toLowerCase())) {
      return;
    }
    const newPlayer: Player = {
      id: `player-${Date.now()}`,
      name,
    };
    setTournament((current) => ({ ...current, players: [...current.players, newPlayer] }));
    setPlayerName('');
  };

  const randomizeTournament = () => {
    if (tournament.players.length === 0) return;
    const next = generateTournament(tournament.players);
    setTournament({ ...next, settings: { ...tournament.settings } });
  };

  const startTournament = () => {
    const readyMatchIds = new Set<number>();
    for (let tableNumber = 1; tableNumber <= tournament.settings.tables; tableNumber += 1) {
      const firstMatch = tournament.matches.find((match) => match.tableNumber === tableNumber);
      if (firstMatch) readyMatchIds.add(tournament.matches.indexOf(firstMatch));
    }
    const startedMatches: Match[] = tournament.matches.map((match, index) => ({
      ...match,
      status: readyMatchIds.has(index) ? 'Ready' : 'Upcoming',
    }));
    setTournament((current) => ({ ...current, matches: startedMatches }));
  };

  const clearAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setTournament({
      settings: { ...DEFAULT_SETTINGS },
      players: [],
      groups: [],
      matches: [],
    });
    setSelectedMatchId('');
  };

  const logout = () => {
    setAdminLoggedIn(false);
  };

  const selectMatch = (matchId: string) => {
    const match = tournament.matches.find((item) => item.id === matchId);
    setSelectedMatchId(matchId);
    setScoreMessage('');
    setGameScores(match?.scores?.map((score) => ({
      player1: score.player1Score,
      player2: score.player2Score,
    })) ?? blankGameScores);
  };

  const saveScore = () => {
    const match = tournament.matches.find((item) => item.id === selectedMatchId);
    if (!match || !match.player1Id || !match.player2Id) {
      setScoreMessage('Select a scheduled match first.');
      return;
    }

    const valid = gameScores.every((game) => (
      typeof game.player1 === 'number'
      && typeof game.player2 === 'number'
      && (validateGameScore(game.player1, game.player2) || validateGameScore(game.player2, game.player1))
    ));
    if (!valid) {
      setScoreMessage('Enter valid scores: first to 11, win by 2.');
      return;
    }

    const p1Wins = gameScores.filter((game) => Number(game.player1) > Number(game.player2)).length;
    const p2Wins = gameScores.filter((game) => Number(game.player2) > Number(game.player1)).length;
    const winnerId = p1Wins > p2Wins ? match.player1Id : match.player2Id;

    const nextMatch = tournament.matches
      .filter((item) => item.tableNumber === match.tableNumber && item.status === 'Upcoming' && item.id !== match.id)
      .sort((a, b) => a.queueOrder - b.queueOrder)[0];
    const updated: Match[] = tournament.matches.map((item): Match => {
      if (item.id === match.id) {
        return {
          ...item,
          status: 'Completed',
          winnerId,
          updatedAt: new Date().toISOString(),
          scores: gameScores.map((game, index) => ({
            matchId: item.id,
            gameNumber: index + 1,
            player1Score: Number(game.player1),
            player2Score: Number(game.player2),
          })),
        };
      }
      if (!match.status.includes('Completed') && nextMatch && item.id === nextMatch.id) {
        return { ...item, status: 'Ready' };
      }
      return item;
    });

    setTournament((current) => ({ ...current, matches: updated }));
    setScoreMessage(nextMatch && !match.status.includes('Completed')
      ? `Result saved. Next match on Table ${match.tableNumber} is ready.`
      : 'Result saved successfully.');
    setGameScores(blankGameScores);
    if (nextMatch && !match.status.includes('Completed')) {
      setSelectedMatchId(nextMatch.id);
    }
  };

  if (!adminLoggedIn) {
    return (
      <main className="page">
        <h3>Admin login</h3>
        <form className="admin-form" onSubmit={handleLogin}>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <button type="submit">Login</button>
        </form>
        <p className="note">Demo mode: any valid email + password works locally. For production, connect Supabase Auth and RLS.</p>
      </main>
    );
  }

  return (
    <main className="page">
      <h3>Admin dashboard</h3>
      <section className="card-grid">
        <div className="card">
          <h4>Tournament</h4>
          <div className="button-row">
            <button onClick={startTournament}>Start tournament</button>
            <button onClick={() => setTournament((current) => ({ ...current, matches: current.matches.map((match) => ({ ...match, status: 'Upcoming' })) }))}>Pause</button>
            <button onClick={clearAllData}>Clear all data</button>
            <button onClick={logout}>Logout</button>
          </div>
        </div>

        <div className="card">
          <h4>Current tables</h4>
          {Array.from({ length: tournament.settings.tables }, (_, index) => (
            <div key={index} className="mini-table">Table {index + 1}</div>
          ))}
        </div>
      </section>

      <section className="card">
        <h4>Player registration</h4>
        <div className="player-entry">
          <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Add player" />
          <button onClick={addPlayer}>+ Add player</button>
        </div>
        <ul className="player-list">
          {tournament.players.map((player) => (
            <li key={player.id}>
              <span>{player.name}</span>
              <button onClick={() => setTournament((current) => ({ ...current, players: current.players.filter((item) => item.id !== player.id) }))}>Remove</button>
            </li>
          ))}
        </ul>
        <div className="button-row">
          <button onClick={randomizeTournament}>🎲 Randomize & create tournament</button>
        </div>
      </section>

      <section className="card">
        <h4>Schedule</h4>
        <div className="schedule-list">
          {tournament.matches.length === 0 ? (
            <p className="note">No tournament scheduled yet.</p>
          ) : tournament.matches.map((match) => {
            const p1 = match.player1Id ? tournament.players.find((player) => player.id === match.player1Id)?.name ?? 'TBD' : 'TBD';
            const p2 = match.player2Id ? tournament.players.find((player) => player.id === match.player2Id)?.name ?? 'TBD' : 'TBD';
            return (
              <div key={match.id} className="schedule-item">
                <strong>{p1} vs {p2}</strong>
                <small>{match.groupId ? `Group ${match.groupId.replace('group-', '')}` : 'Group'} • Table {match.tableNumber ?? 'TBD'} • {match.status}</small>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h4>Quick score entry</h4>
        <select value={selectedMatchId} onChange={(event) => selectMatch(event.target.value)}>
          {tournament.matches.map((match) => {
            const p1 = match.player1Id ? tournament.players.find((player) => player.id === match.player1Id)?.name ?? 'TBD' : 'TBD';
            const p2 = match.player2Id ? tournament.players.find((player) => player.id === match.player2Id)?.name ?? 'TBD' : 'TBD';
            return <option key={match.id} value={match.id}>{p1} vs {p2} • {match.status}</option>;
          })}
        </select>

        {(() => {
          const match = tournament.matches.find((item) => item.id === selectedMatchId);
          const p1Name = match?.player1Id ? tournament.players.find((player) => player.id === match.player1Id)?.name ?? 'Player 1' : 'Player 1';
          const p2Name = match?.player2Id ? tournament.players.find((player) => player.id === match.player2Id)?.name ?? 'Player 2' : 'Player 2';

          return (
            <>
              <div className="match-score-header">
                <strong>{p1Name} vs {p2Name}</strong>
                <small>Best of 3 games</small>
              </div>

              {gameScores.map((game, index) => (
                <div key={index} className="game-score-row">
                  <span>Game {index + 1}</span>
                  <div className="score-inline compact">
                    <label>{p1Name}</label>
                    <input type="number" min="0" value={game.player1} onChange={(event) => setGameScores((current) => current.map((entry, i) => i === index ? { ...entry, player1: event.target.value === '' ? '' : Number(event.target.value) } : entry))} />
                    <span>:</span>
                    <input type="number" min="0" value={game.player2} onChange={(event) => setGameScores((current) => current.map((entry, i) => i === index ? { ...entry, player2: event.target.value === '' ? '' : Number(event.target.value) } : entry))} />
                    <label>{p2Name}</label>
                  </div>
                </div>
              ))}

              <p className="note">Format: 11-8 / 9-11 / 11-7</p>
              <button onClick={saveScore}>Save result</button>
              {scoreMessage && <p className="success-message" role="status">{scoreMessage}</p>}
            </>
          );
        })()}
      </section>

      <section className="card">
        <h4>Completed matches</h4>
        <div className="schedule-list">
          {tournament.matches.filter((match) => match.status === 'Completed').length === 0 ? (
            <p className="note">No completed matches yet.</p>
          ) : tournament.matches.filter((match) => match.status === 'Completed').map((match) => {
            const p1 = match.player1Id ? tournament.players.find((player) => player.id === match.player1Id)?.name ?? 'TBD' : 'TBD';
            const p2 = match.player2Id ? tournament.players.find((player) => player.id === match.player2Id)?.name ?? 'TBD' : 'TBD';
            const winner = match.winnerId ? tournament.players.find((player) => player.id === match.winnerId)?.name ?? 'Unknown' : 'Unknown';
            return (
              <div key={match.id} className="schedule-item">
                <strong>{p1} vs {p2}</strong>
                <small>Table {match.tableNumber ?? 'TBD'} • Winner: {winner}</small>
                <button className="secondary" onClick={() => selectMatch(match.id)}>Edit result</button>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

export default App;
