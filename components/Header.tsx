import React from 'react';
import { Share2, HelpCircle, Info, Folder, ChevronDown } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <div className="bg-white border-b border-gray-200 flex-shrink-0">
      {/* Top Bar */}
      <div className="h-14 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-1.5 bg-gray-100 rounded text-gray-600">
            <Folder size={16} />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
            <span>Projetos</span>
            <span className="text-gray-300">•</span>
            <span className="font-medium text-gray-900 truncate max-w-md">Construção de uma residência unifamiliar de 450m² - sem acabamento</span>
            <Info size={14} className="text-gray-400" />
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <div className="flex items-center gap-1 px-2 py-1 bg-gray-50 border rounded text-xs font-medium">
              v1.0 <ChevronDown size={12} />
            </div>
            <div className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full">
              Em execução
            </div>
            <div className="text-xs text-gray-400 flex items-center gap-1">
              <Folder size={12} /> Alterado hoje
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <HelpCircle className="w-5 h-5 text-gray-400 cursor-pointer" />
          <Share2 className="w-5 h-5 text-gray-400 cursor-pointer" />
          <button className="bg-[#0f172a] text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-slate-800">
            Consolidar
          </button>
        </div>
      </div>

      {/* Sub Header - Tabs & Totals */}
      <div className="px-6 pt-2 flex justify-between items-end">
        <div className="flex gap-6 text-sm font-medium">
          {['Parâmetros', 'BDI', 'Orçamento', 'CPUs', 'Insumos', 'Cronograma', 'Encargos Sociais', 'Resumo', 'Relatórios'].map((tab) => (
            <div 
              key={tab} 
              className={`pb-3 cursor-pointer border-b-2 transition-colors ${
                tab === 'Orçamento' 
                  ? 'border-orange-500 text-orange-600' 
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {tab}
            </div>
          ))}
        </div>

        <div className="flex gap-8 pb-3 text-xs">
            <div className="text-right">
                <div className="text-gray-500">Total sem BDI:</div>
                <div className="font-semibold text-gray-800">R$ 1.200,00</div>
            </div>
            <div className="text-right">
                <div className="text-gray-500">BDI:</div>
                <div className="font-semibold text-gray-800">R$ 0,00</div>
            </div>
            <div className="text-right">
                <div className="text-gray-500">Total com BDI:</div>
                <div className="font-semibold text-red-600">R$ 1.200,00</div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Header;