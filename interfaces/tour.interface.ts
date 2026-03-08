export interface ITourState {
  checklistDismissedAt: string | null;
  aiPageVisited: boolean;
  tourStartedAt: string;
  tourCompletedAt: string | null;
}

export interface ITourProgress {
  gatewayConnected: boolean;
  trackerInstalled: boolean;
  funnelEventReceived: boolean;
  costsConfigured: boolean;
  aiExplored: boolean;
  allComplete: boolean;
  completedCount: number;
  totalCount: number;
  checklistDismissed: boolean;
}
