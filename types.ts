
export enum ItemType {
  SYNTHETIC = 'SYNTHETIC', // Groups (e.g., 1. Serviços Preliminares)
  ANALYTIC = 'ANALYTIC',   // Items (e.g., 1.1 Tapume)
}

export interface DatabaseItem {
  id: string;
  code: string;
  source: 'SINAPI' | 'SICRO' | 'PRÓPRIA';
  description: string;
  unit: string;
  price: number;
  type: 'INSUMO' | 'COMPOSICAO';
  date: string; // ISO Date string YYYY-MM-DD
}

export interface BudgetItem {
  id: string;
  level: string; // "1", "1.1", "1.2"
  description: string;
  type: ItemType;
  
  // Values for calculation
  value?: number; // Legacy/Total value (can be kept for synthetic items sum)
  
  // Editable fields for Analytic items
  quantity?: number;
  unit?: string;
  unitPrice?: number;

  databaseItem?: DatabaseItem; // Linked DB item if applicable
  calculationMemory?: string;
  costBreakdown?: {
    material: number; // percentage 0-100
    labor: number;    // percentage 0-100
    others: number;   // percentage 0-100
  };
}

export interface SavedBlock {
  id: string;
  name: string;
  createdAt: string;
  itemCount: number;
  items: BudgetItem[];
}

export interface ProjectMetadata {
  name: string;
  area: string;
  status: string;
  version: string;
  referenceDate: string; // The fixed date of the project budget (e.g., "2019-06-01")
}
