export interface IAnalysisFinding {
  severity: "critical" | "warning" | "good";
  title: string;
  metric: string;
  description: string;
}

export interface IAnalysisAction {
  priority: number;
  title: string;
  description: string;
  impact: string;
  roi: "alto" | "medio" | "baixo";
  done?: boolean;
}

export interface IAnalysisDiagnosis {
  title: string;
  severity: "critical" | "warning" | "info";
  content: string;
}

export interface IAnalysisResult {
  score: number;
  scoreLabel: string;
  summary: string;
  findings: IAnalysisFinding[];
  diagnoses: IAnalysisDiagnosis[];
  actions: IAnalysisAction[];
}

export interface IAnalysisHistoryEntry {
  id: string;
  timestamp: string;
  score: number;
  scoreLabel: string;
  summary: string;
  findingsCounts: { critical: number; warning: number; good: number };
  actionsCount: number;
  result: IAnalysisResult;
}

export interface IAiProfile {
  segment?: string;
  model?: string;
  taxRegime?: string;
  monthlyGoal?: number;
}

export interface IComparisonFinding {
  titulo: string;
  severidade: "positivo" | "atencao" | "critico";
  metrica: string;
  valor_a: string;
  valor_b: string;
  variacao: string;
  interpretacao: string;
}

export interface IComparisonAction {
  prioridade: number;
  titulo: string;
  acao: string;
  impacto_estimado: string;
  prazo: "imediato" | "esta_semana" | "este_mes";
}

export interface IComparisonResult {
  score: number;
  scoreLabel: string;
  resumo: string;
  veredicto: "crescimento" | "estabilidade" | "declinio" | "anomalia";
  achados: IComparisonFinding[];
  diagnostico: string;
  plano: IComparisonAction[];
}

export interface IMetricVariation {
  label: string;
  valueA: number;
  valueB: number;
  formattedA: string;
  formattedB: string;
  variation: string;
  isPositive: boolean;
  isCurrency: boolean;
}
