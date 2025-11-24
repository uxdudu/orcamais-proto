import { DatabaseItem } from './types';

export const INITIAL_PROJECT_DATE = "2019-06-01"; // SINAPI 06/2019

export const MOCK_SEARCH_RESULTS: DatabaseItem[] = [
  {
    id: 'm1',
    code: '98567',
    source: 'SINAPI',
    description: 'Tapume de madeira com altura de 2,00 m, executado com tábuas de pinus ou similar, incluindo instalação, escoramento, pintura de identificação e posterior retirada.',
    unit: 'm²',
    price: 240.00,
    type: 'INSUMO',
    date: '2019-06-01' // Matches project
  },
  {
    id: 'm2',
    code: '98568',
    source: 'SINAPI',
    description: 'Tapume metálico modular com painéis de chapa galvanizada e estrutura em tubos de aço galvanizado, fixação por sapatas metálicas, incluindo montagem e desmontagem.',
    unit: 'm²',
    price: 285.50,
    type: 'INSUMO',
    date: '2024-01-01' // NEWER than project
  },
  {
    id: 'm3',
    code: '98569',
    source: 'SINAPI',
    description: 'Tapume em painel OSB de 15 mm com estrutura em madeira de reflorestamento, pintura externa de cor padrão e letreiro "OBRA EM EXECUÇÃO", incluindo montagem e retirada.',
    unit: 'm²',
    price: 190.20,
    type: 'INSUMO',
    date: '2019-06-01' // Matches project
  }
];