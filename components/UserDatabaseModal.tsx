
import React, { useState } from 'react';
import { X, Database, Search, Trash2, Calendar, Tag } from 'lucide-react';
import { DatabaseItem } from '../types';

interface Props {
  isOpen: boolean;
  items: DatabaseItem[];
  onClose: () => void;
  onDeleteItem: (id: string) => void;
}

const UserDatabaseModal: React.FC<Props> = ({ isOpen, items, onClose, onDeleteItem }) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredItems = items.filter(i => 
    i.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    i.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[800px] h-[600px] flex flex-col overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div>
            <h2 className="font-bold text-gray-800 text-lg flex items-center gap-2">
              <div className="bg-purple-100 p-1.5 rounded text-purple-600">
                <Database size={20}/>
              </div>
              Minha Base Própria
            </h2>
            <p className="text-xs text-gray-500 mt-1">Gerencie seus itens personalizados e composições privadas.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20}/>
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex gap-4 items-center bg-white">
           <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16}/>
              <input 
                type="text" 
                placeholder="Buscar na minha base (Código ou Descrição)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-200 transition-all bg-white"
              />
           </div>
           <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
              <span className="bg-gray-100 px-2 py-1 rounded">Total: {items.length} itens</span>
           </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
           {items.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
                <Database size={48} strokeWidth={1} className="opacity-20"/>
                <p className="text-sm font-medium">Sua base está vazia.</p>
                <p className="text-xs max-w-xs text-center">Adicione itens clicando em "Salvar na Minha Base" no menu de contexto dos itens do orçamento.</p>
             </div>
           ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <p className="text-sm">Nenhum item encontrado para "{searchTerm}".</p>
              </div>
           ) : (
             <table className="w-full text-left border-collapse">
               <thead className="bg-gray-50 sticky top-0 z-10 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                 <tr>
                   <th className="px-6 py-3 border-b border-gray-100">Código</th>
                   <th className="px-6 py-3 border-b border-gray-100 w-1/2">Descrição</th>
                   <th className="px-6 py-3 border-b border-gray-100 text-center">Tipo</th>
                   <th className="px-6 py-3 border-b border-gray-100 text-center">Und</th>
                   <th className="px-6 py-3 border-b border-gray-100 text-right">Preço</th>
                   <th className="px-6 py-3 border-b border-gray-100 text-center">Ações</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                 {filteredItems.map((item) => (
                   <tr key={item.id} className="hover:bg-purple-50/30 transition-colors group">
                     <td className="px-6 py-3 font-mono text-xs text-gray-500">{item.code}</td>
                     <td className="px-6 py-3 font-medium">{item.description}</td>
                     <td className="px-6 py-3 text-center">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${item.type === 'INSUMO' ? 'bg-green-50 text-green-600 border-green-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                           {item.type === 'INSUMO' ? 'INSUMO' : 'COMPOSIÇÃO'}
                        </span>
                     </td>
                     <td className="px-6 py-3 text-center text-xs uppercase">{item.unit}</td>
                     <td className="px-6 py-3 text-right font-bold text-gray-900">
                        R$ {item.price.toFixed(2)}
                     </td>
                     <td className="px-6 py-3 text-center">
                        <button 
                          onClick={() => onDeleteItem(item.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Remover da base"
                        >
                          <Trash2 size={16}/>
                        </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           )}
        </div>
        
        <div className="p-3 bg-gray-50 border-t border-gray-200 text-[10px] text-gray-400 flex justify-between items-center">
           <span>Base Própria (Local)</span>
           <span className="flex items-center gap-1"><Calendar size={10}/> Atualizado hoje</span>
        </div>

      </div>
    </div>
  );
};

export default UserDatabaseModal;
