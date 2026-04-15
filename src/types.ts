export interface Player {
  id: string;
  name: string;
  team: string;
}

export interface MatchEvent {
  type: 'goal' | 'assist' | 'yellow_card' | 'red_card';
  playerId: string; // The person playing (e.g., Emir)
  realPlayerName: string; // The in-game player (e.g., Mbappe)
  minute?: number;
}

export interface RealPlayerStats {
  name: string;
  team: string;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface Match {
  id: string;
  homePlayerId: string;
  awayPlayerId: string;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  isCompleted: boolean;
  date: number;
}

export interface TournamentStats {
  playerId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export interface Tournament {
  id: string;
  name: string;
  players: Player[];
  matches: Match[];
  createdAt: number;
}
