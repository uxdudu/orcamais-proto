import React from 'react';
import { X, Maximize2, Database, Copy, Printer, ExternalLink, ChevronDown, TrendingUp, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BudgetItem, ItemType } from '../types';

interface Props {
  item: BudgetItem;
  onClose: () => void;
}

const ItemDetailsPanel: React.FC<Props> = ({ item, onClose }) => {
  // Determine type based on database item or item structure
  const isInsumo = item.databaseItem?.type === 'INSUMO';
  const typeLabel = isInsumo ? 'Insumo' : 'Composição';
  const typeColor = isInsumo ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-100';
  
  // Mock data defaults
  const breakdown = item.costBreakdown || { material: 45, labor: 33, others: 22 };
  const memory = item.calculationMemory || 
    `Serviço que contempla instalação, operação e retirada do canteiro de obras.\n\nInclui transporte local de materiais leves, montagem de tapumes, instalações provisórias e limpeza final.\n\nAplicável a obras de pequeno e médio porte, até 1.000 m² de área construída.`;

  // Conic gradient for pie chart
  const pieStyle = {
    background: `conic-gradient(
      #fdba74 0% ${breakdown.labor}%, 
      #fca5a5 ${breakdown.labor}% ${breakdown.labor + breakdown.material}%, 
      #fd8a8a ${breakdown.labor + breakdown.material}% 100%
    )`
  };

  // Mock Data for Composition Details
  const compositionItems = [
    { type: 'C', desc: 'Taqueador ou Taqueiro com Encargos Complementares', coef: 25.00, und: 'h', total: 500.00 },
    { type: 'C', desc: 'Servente com Encargos Complementares', coef: 32.00, und: 'h', total: 480.00 },
    { type: 'I', desc: 'Placa de Identificação da Obra (1,00 m x 0,80 m)', coef: 1.00, und: 'un', total: 250.00 },
    { type: 'I', desc: 'Tapume de Madeira com 2,00 m de altura', coef: 119.99, und: 'm²', total: 2400.00 },
    { type: 'I', desc: 'Desmobilização de Canteiro e Limpeza Final', coef: 1.00, und: 'gl', total: 570.00 },
  ];

  // Mock Data for Price History (Insumo)
  const priceHistory = [
    { month: 'Jan/2024', price: 232.00, var: 0 },
    { month: 'Fev/2024', price: 233.50, var: 0.65 },
    { month: 'Mar/2024', price: 236.00, var: 1.07 },
    { month: 'Abr/2024', price: 238.50, var: 1.06 },
  ];

  return (
    <div className="w-[500px] bg-white border-l border-gray-200 h-full flex flex-col shadow-xl animate-in slide-in-from-right duration-300 z-30">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
        <h2 className="font-semibold text-gray-900">Detalhes d{isInsumo ? 'o Insumo' : 'a Composição'}</h2>
        <div className="flex gap-2 text-gray-400">
          <button className="hover:text-gray-700 p-1"><Maximize2 size={16} /></button>
          <button onClick={onClose} className="hover:text-gray-700 p-1"><X size={16} /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
        
        {/* Top Section: Tags & Title */}
        <div className="space-y-4">
            <div className="flex gap-2">
                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${typeColor} uppercase tracking-wide`}>
                    {typeLabel}
                </span>
                {item.databaseItem && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full border border-gray-200 flex items-center gap-1">
                    <Database size={10} /> {item.databaseItem.source}
                    </span>
                )}
                <span className="px-3 py-1 bg-gray-50 text-gray-600 text-xs font-bold rounded-full border border-gray-200">
                    {item.databaseItem?.code || '00000'}
                </span>
            </div>

            <div>
                <h1 className="text-xl font-bold text-gray-900 leading-snug mb-2">
                    {item.description}
                </h1>
                <div className="text-sm text-gray-500 space-y-1">
                    <p>Unidade: <span className="font-medium text-gray-800 uppercase">{item.databaseItem?.unit || 'un'}</span></p>
                    <p>Origem: <span className="font-medium text-gray-800">{item.databaseItem?.source || 'SINAPI'} – Base Outubro / 2025</span></p>
                </div>
            </div>
        </div>

        {/* --- LAYOUT FOR INSUMO (MATERIAL/INPUT) --- */}
        {isInsumo && (
            <>
                {/* Price History Table */}
                <div className="animate-in fade-in duration-500">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-gray-900">Histórico de Preços – Estado: RN</h3>
                        <ChevronDown size={14} className="text-gray-400"/>
                    </div>
                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                <tr>
                                    <th className="px-4 py-2 text-left font-medium">Estado</th>
                                    <th className="px-4 py-2 text-right font-medium">Vlr (R$)</th>
                                    <th className="px-4 py-2 text-right font-medium">Variação (%)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {priceHistory.map((hist, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50">
                                        <td className="px-4 py-2.5 text-gray-600">{hist.month}</td>
                                        <td className="px-4 py-2.5 text-right font-medium text-gray-900">R$ {hist.price.toFixed(2)}</td>
                                        <td className="px-4 py-2.5 text-right">
                                            <span className={`flex items-center justify-end gap-1 ${hist.var > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                {hist.var > 0 ? '+' : ''}{hist.var.toFixed(2)}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Trends Info */}
                <div className="space-y-4">
                    <div>
                        <h4 className="text-xs font-semibold text-blue-600 mb-1">Tendência:</h4>
                        <p className="text-sm text-gray-700">Estável, com variação média anual inferior a 5%</p>
                    </div>
                    <div>
                        <h4 className="text-xs font-semibold text-blue-600 mb-1">Fonte:</h4>
                        <p className="text-sm text-gray-700">SINAPI / Caixa Econômica Federal – RN (Out/2025)</p>
                    </div>
                </div>
                
                <div className="pt-4 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
                     <Clock size={12}/> Última atualização realizada há 1 dia
                </div>
            </>
        )}


        {/* --- LAYOUT FOR COMPOSICAO (COMPOSITION) --- */}
        {!isInsumo && (
            <>
                {/* Cost Chart */}
                <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-4">Distribuição de Custos</h3>
                    <div className="flex items-center gap-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        {/* CSS Pie Chart */}
                        <div className="w-28 h-28 rounded-full flex-shrink-0 relative shadow-sm" style={pieStyle}>
                            <div className="absolute inset-0 m-auto w-14 h-14 bg-gray-50 rounded-full"></div>
                        </div>

                        {/* Legend */}
                        <div className="space-y-2 text-xs flex-1">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-orange-300 rounded-sm shadow-sm"></div><span className="text-gray-600">Mão de Obra</span></div>
                                <span className="font-bold text-gray-900">{breakdown.labor}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-200 rounded-sm shadow-sm"></div><span className="text-gray-600">Materiais</span></div>
                                <span className="font-bold text-gray-900">{breakdown.material}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-300 rounded-sm shadow-sm"></div><span className="text-gray-600">Leis Sociais</span></div>
                                <span className="font-bold text-gray-900">{breakdown.others}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Calculation Memory */}
                <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Memória de Cálculo</h3>
                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                        {memory}
                    </div>
                </div>

                {/* Tags Field */}
                <div>
                   <h3 className="text-sm font-bold text-gray-900 mb-2">Tags</h3>
                   <div className="flex gap-2">
                        <span className="px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded text-xs flex items-center gap-1">Nome da Tag <X size={10} className="cursor-pointer hover:text-yellow-900"/></span>
                        <span className="px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded text-xs flex items-center gap-1">Nome da Tag <X size={10} className="cursor-pointer hover:text-yellow-900"/></span>
                        <input type="text" placeholder="Text" className="text-xs border-none focus:ring-0 bg-transparent placeholder-gray-400 w-12"/>
                   </div>
                </div>

                {/* Detailed Composition Table */}
                <div>
                    <h3 className="text-sm font-bold text-gray-900 mb-3">Composição Detalhada</h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
                                <tr>
                                    <th className="px-3 py-2 text-left">Descrição</th>
                                    <th className="px-3 py-2 text-right w-16">Coef</th>
                                    <th className="px-3 py-2 text-center w-12">Und</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {compositionItems.map((comp, i) => (
                                    <tr key={i} className="hover:bg-gray-50/50">
                                        <td className="px-3 py-2 text-gray-700 flex gap-2 items-start">
                                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[8px] font-bold flex-shrink-0 mt-0.5 ${comp.type === 'C' ? 'text-blue-500 border-blue-200 bg-blue-50' : 'text-green-500 border-green-200 bg-green-50'}`}>
                                                {comp.type}
                                            </span>
                                            {comp.desc}
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-600">{comp.coef.toFixed(2).replace('.',',')}</td>
                                        <td className="px-3 py-2 text-center text-gray-500">{comp.und}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50/80 text-gray-500 border-t border-gray-200">
                                <tr>
                                    <td className="px-3 py-1.5 text-right" colSpan={3}>Custo Direto: <span className="font-medium text-gray-900">R$ 4.200,00</span></td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-1.5 text-right" colSpan={3}>BDI (20%): <span className="font-medium text-gray-900">R$ 840,00</span></td>
                                </tr>
                                <tr>
                                    <td className="px-3 py-1.5 text-right" colSpan={3}>Preço Final: <span className="font-bold text-gray-900">R$ 5.040,00</span></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                {/* Technical Info */}
                <div className="space-y-4 pt-2">
                    <h3 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Informações Técnicas da Composição</h3>
                    
                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-700">Características</h4>
                        <div className="p-3 bg-gray-50 rounded border border-gray-100 text-xs text-gray-600 leading-relaxed">
                            Serviço que contempla instalação, operação e retirada do canteiro de obras.<br/><br/>
                            Inclui transporte local de materiais leves, montagem de tapumes, instalações provisórias e limpeza final.<br/><br/>
                            Aplicável a obras de pequeno e médio porte, até 1.000 m² de área construída.
                            Envolve mão de obra predominantemente manual e materiais básicos (madeira, fios, tubulações).
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-700">Quantificação</h4>
                        <div className="h-20 bg-gray-50 rounded border border-gray-100 p-3 text-xs text-gray-400 italic">
                            Placeholder
                        </div>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-700">Aferição</h4>
                        <p className="text-xs text-gray-600 leading-relaxed text-justify">
                            A aferição contempla o transporte interno de materiais e equipamentos leves, a montagem e desmontagem de barracão, tapume e redes provisórias, além da instalação de placa de identificação da obra. Não estão incluídos os custos de transporte de máquinas pesadas por terceiros, nem as ligações definitivas de energia, água ou esgoto e suas respectivas taxas municipais.
                        </p>
                    </div>

                     <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-700">Equipamentos</h4>
                        <p className="text-xs text-gray-600 leading-relaxed text-justify">
                           Os equipamentos utilizados são ferramentas manuais, caminhão leve para transporte, furadeiras, serras e extensões elétricas, todos empregados de forma auxiliar à execução. Essa composição envolve predominantemente mão de obra manual e materiais de uso temporário, sendo a aferição final condicionada à vistoria da área completamente desmobilizada e limpa.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <h4 className="text-xs font-bold text-gray-700">Execução</h4>
                        <p className="text-xs text-gray-600 leading-relaxed text-justify">
                            A execução inicia-se com a mobilização do canteiro, incluindo a instalação de cercamentos perimetrais, montagem de barracão e estruturas provisórias e colocação da placa da obra. Durante a execução da construção, é responsabilidade da equipe manter o canteiro organizado, funcional e limpo, realizando pequenos deslocamentos e transportes internos. Ao final, realiza-se a desmobilização com a retirada integral das instalações, desmontagem de estruturas provisórias, recolhimento de entulhos e limpeza completa do terreno, de modo a deixá-lo em condições adequadas de entrega.
                        </p>
                    </div>

                    <div className="pt-4 flex items-center gap-2 text-xs text-gray-400">
                        <Clock size={12}/> Última atualização realizada há 1 dia
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default ItemDetailsPanel;