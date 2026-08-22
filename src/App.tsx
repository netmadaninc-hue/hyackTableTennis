import { useMemo, useState } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import { createDemoTournament, generateTournament, calculateStandings, validateGameScore } from './lib/tournament';
import { useLocalStorage } from './lib/localStorage';
import type { Match, Player, TournamentData } from './types';

const STORAGE_KEY = 'hyack-table-tennis-data';
const PLAYER_KEY = 'hyack-table-tennis-player';
const AUTH_KEY = 'hyack-table-tennis-admin';

const demoTournament = createDemoTournament();

function App() {
  const [tournament, setTournament] = useLocalStorage<TournamentData>(STORAGE_KEY, demoTournament);
  const [selectedPlayerId, setSelectedPlayerId] = useLocalStorage<string | null>(PLAYER_KEY, demoTournament.players[0]?.id ?? null);
  const [adminLoggedIn, setAdminLoggedIn] = useLocalStorage<boolean>(AUTH_KEY, false);

  const selectedPlayer = tournament.players.find((player) => player.id === selectedPlayerId) ?? tournament.players[0] ?? null;

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
        <NavLink to="/find-match">Find Match</NavLink>
        <NavLink to="/rankings">Standings</NavLink>
        <NavLink to="/bracket">Bracket</NavLink>
        <NavLink to="/rules">Rules</NavLink>
        <NavLink to="/admin">Admin</NavLink>
      </nav>

      <Routes>
        <Route path="/" element={<LiveDashboard tournament={tournament} />} />
        <Route path="/find-match" element={<FindMatchPage tournament={tournament} selectedPlayerId={selectedPlayerId} onSelect={setSelectedPlayerId} />} />
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
  const currentMatches = tournament.matches.filter((match) => match.status === 'In Progress' || match.status === 'Ready');
  const nextMatches = tournament.matches.filter((match) => match.status === 'Upcoming').slice(0, 4);
  const playerMap = new Map(tournament.players.map((player) => [player.id, player.name]));

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
            const match = currentMatches[index] ?? tournament.matches.find((item) => item.tableNumber === index + 1 && item.status !== 'Completed');
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
              <small>Table {match.tableNumber ?? index + 1} • Queue {match.queueOrder}</small>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function FindMatchPage({ tournament, selectedPlayerId, onSelect }: { tournament: TournamentData; selectedPlayerId: string | null; onSelect: (id: string) => void; }) {
  const [query, setQuery] = useState('');
  const filteredPlayers = tournament.players.filter((player) => player.name.toLowerCase().includes(query.toLowerCase()));
  const selectedPlayer = tournament.players.find((player) => player.id === selectedPlayerId) ?? tournament.players[0] ?? null;
  const playerMap = new Map(tournament.players.map((player) => [player.id, player.name]));
  const nextMatch = tournament.matches.find((match) => match.player1Id === selectedPlayer?.id || match.player2Id === selectedPlayer?.id) ?? null;
  const standings = useMemo(() => calculateStandings(tournament.matches, tournament.players), [tournament]);
  const ranking = standings.find((entry) => entry.playerId === selectedPlayer?.id);

  return (
    <main className="page">
      <h3>Find your match</h3>
      <div className="search-box">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search player name" />
      </div>
      <div className="chip-list">
        {filteredPlayers.map((player) => (
          <button key={player.id} className={player.id === selectedPlayer?.id ? 'chip active' : 'chip'} onClick={() => onSelect(player.id)}>
            {player.name}
          </button>
        ))}
      </div>

      {selectedPlayer && (
        <section className="hero-card">
          <p className="eyebrow">Your tournament</p>
          <h2>{selectedPlayer.name}</h2>
          <div className="match-panel">
            <strong>🏓 {nextMatch ? `${playerMap.get(nextMatch.player1Id ?? '') ?? 'TBD'} vs ${playerMap.get(nextMatch.player2Id ?? '') ?? 'TBD'}` : 'No match scheduled yet'}</strong>
            <small>📍 Table {nextMatch?.tableNumber ?? 'TBD'} • ⏳ {nextMatch?.status ?? 'Waiting'}</small>
          </div>
          <div className="stats-grid">
            <div><span>Group</span><strong>–</strong></div>
            <div><span>Rank</span><strong>{ranking ? `${standings.findIndex((entry) => entry.playerId === selectedPlayer.id) + 1}` : '–'}</strong></div>
            <div><span>Wins</span><strong>{ranking?.won ?? 0}</strong></div>
            <div><span>Losses</span><strong>{ranking?.lost ?? 0}</strong></div>
          </div>
        </section>
      )}
    </main>
  );
}

function RankingsPage({ tournament }: { tournament: TournamentData }) {
  const standings = calculateStandings(tournament.matches, tournament.players);

  return (
    <main className="page">
      <h3>Groups and rankings</h3>
      <div className="standings-list">
        {standings.map((entry, index) => (
          <article key={entry.playerId} className="standing-card">
            <div className="rank-badge">#{index + 1}</div>
            <div>
              <strong>{entry.playerName}</strong>
              <small>W {entry.won} • L {entry.lost}</small>
            </div>
            <div className="score-mini">
              <span>Games: {entry.gameDifference > 0 ? `+${entry.gameDifference}` : entry.gameDifference}</span>
              <span>Points: {entry.pointDifference > 0 ? `+${entry.pointDifference}` : entry.pointDifference}</span>
            </div>
          </article>
        ))}
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
  const [scores, setScores] = useState({ p1: 11, p2: 7 });

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
    if (tournament.players.length < 4) return;
    const next = generateTournament(tournament.players);
    setTournament({ ...next, settings: { ...tournament.settings } });
  };

  const saveScore = () => {
    const match = tournament.matches.find((item) => item.id === selectedMatchId);
    if (!match) return;
    if (!validateGameScore(scores.p1, scores.p2)) return;
    const winnerId = scores.p1 > scores.p2 ? match.player1Id : match.player2Id;
    const updated: Match[] = tournament.matches.map((item): Match => item.id === match.id
      ? { ...item, status: 'Completed', winnerId, updatedAt: new Date().toISOString() }
      : item);
    setTournament((current) => ({ ...current, matches: updated }));
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
            <button>Start</button>
            <button>Pause</button>
            <button>Reset</button>
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
        <h4>Quick score entry</h4>
        <select value={selectedMatchId} onChange={(event) => setSelectedMatchId(event.target.value)}>
          {tournament.matches.map((match) => (
            <option key={match.id} value={match.id}>{match.player1Id && match.player2Id ? `${match.player1Id} vs ${match.player2Id}` : 'TBD'}</option>
          ))}
        </select>
        <div className="score-inline">
          <input type="number" value={scores.p1} onChange={(e) => setScores({ ...scores, p1: Number(e.target.value) })} />
          <span>–</span>
          <input type="number" value={scores.p2} onChange={(e) => setScores({ ...scores, p2: Number(e.target.value) })} />
        </div>
        <button onClick={saveScore}>Save result</button>
      </section>
    </main>
  );
}

export default App;
