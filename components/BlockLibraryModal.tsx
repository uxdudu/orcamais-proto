import React, { useState, useEffect } from 'react';
import { X, Package, Calendar, Trash2, ChevronRight, ChevronDown, Folder, FileText, Search, Download, Layers } from 'lucide-react';
import { SavedBlock, ItemType, BudgetItem } from '../types';

interface Props {
  isOpen: boolean;
  blocks: SavedBlock[];
  onClose: () => void;
  onDeleteBlock: (id: string) => void;
  onInsertBlock?: (block: SavedBlock) => void;
}

const BlockLibraryModal: React.FC<Props> = ({ isOpen, blocks, onClose, onDeleteBlock, onInsertBlock }) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for tree view in preview
  const [previewCollapsedIds, setPreviewCollapsedIds] = useState<Set<string>>(new Set());

  // Reset collapsed state when selecting a different block
  useEffect(() => {
    setPreviewCollapsedIds(new Set());
  }, [selectedBlockId]);

  if (!isOpen) return null;

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  const filteredBlocks = blocks.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Tree Logic for Preview ---

  const togglePreviewCollapse = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPreviewCollapsedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isPreviewVisible = (item: BudgetItem, allItems: BudgetItem[]) => {
    if (!item.level.includes('.')) return true; // Root items always visible

    const parts = item.level.split('.');
    // Check ancestors
    for (let i = 1; i < parts.length; i++) {
      const parentLevel = parts.slice(0, i).join('.');
      // Find the ancestor item object to get its ID
      const parentItem = allItems.find(pi => pi.level === parentLevel);
      if (parentItem && previewCollapsedIds.has(parentItem.id)) {
        return false;
      }
    }
    return true;
  };

  // Sort items by level to ensure tree order
  const getSortedItems = (items: BudgetItem[]) => {
    return [...items].sort((a, b) => {
      const aParts = a.level.split('.').map(Number);
      const bParts = b.level.split('.').map(Number);
      for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
        const partA = aParts[i] || 0;
        const partB = bParts[i] || 0;
        if (partA !== partB) return partA - partB;
      }
      return 0;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[900px] h-[600px] flex overflow-hidden border border-gray-200 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Left Sidebar: List */}
        <div className="w-1/3 bg-gray-50 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <Package className="text-orange-600" size={20}/>
              Biblioteca de Blocos
            </h2>
            <div className="mt-3 relative">
              <Search className="absolute left-2.5 top-2 text-gray-400" size={14}/>
              <input 
                type="text" 
                placeholder="Buscar blocos salvos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500 bg-white"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredBlocks.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-xs">
                Nenhum bloco encontrado.
              </div>
            )}
            {filteredBlocks.map(block => (
              <div 
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedBlockId === block.id ? 'bg-white border-blue-300 shadow-sm' : 'border-transparent hover:bg-gray-100'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-medium text-sm ${selectedBlockId === block.id ? 'text-blue-700' : 'text-gray-700'}`}>
                    {block.name}
                  </span>
                  {selectedBlockId === block.id && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onDeleteBlock(block.id); if(selectedBlockId === block.id) setSelectedBlockId(null); }}
                      className="text-gray-400 hover:text-red-500"
                      title="Excluir bloco"
                    >
                      <Trash2 size={14}/>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><Calendar size={10}/> {new Date(block.createdAt).toLocaleDateString('pt-BR')}</span>
                  <span>•</span>
                  <span>{block.itemCount} itens</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Area: Preview */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="h-14 border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
            <span className="text-sm font-semibold text-gray-600 flex items-center gap-2">
              {selectedBlock ? (
                  <>
                    <Layers size={16} className="text-blue-500"/>
                    Pré-visualização: {selectedBlock.name}
                  </>
              ) : 'Selecione um bloco para visualizar'}
            </span>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600">
              <X size={20}/>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
            {selectedBlock ? (
              <div className="min-w-full inline-block align-middle">
                 <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-400 border-b border-gray-100 sticky top-0 z-10 grid grid-cols-12 gap-2">
                    <div className="col-span-10">Estrutura do Bloco</div>
                    <div className="col-span-2 text-center">Tipo</div>
                 </div>
                 <div className="py-2">
                    {getSortedItems(selectedBlock.items).map((item) => {
                      if (!isPreviewVisible(item, selectedBlock.items)) return null;

                      const isSynthetic = item.type === ItemType.SYNTHETIC;
                      const isCollapsed = previewCollapsedIds.has(item.id);
                      
                      // Calculate Indentation
                      // E.g., 1.1.1 has 2 dots, so level depth is 2.
                      // Base indentation logic relies on relative structure within the block
                      const levelDepth = item.level.split('.').length - 1;
                      const paddingLeft = 16 + (levelDepth * 20);

                      return (
                        <div 
                          key={item.id} 
                          className={`grid grid-cols-12 gap-2 pr-4 py-1.5 text-sm hover:bg-blue-50 transition-colors items-center group ${isSynthetic ? 'text-gray-800' : 'text-gray-600'}`}
                        >
                           <div className="col-span-10 flex items-center" style={{ paddingLeft: `${paddingLeft}px` }}>
                              {/* Collapse Icon */}
                              <div className="w-6 flex-shrink-0 flex justify-center">
                                {isSynthetic ? (
                                  <button 
                                    onClick={(e) => togglePreviewCollapse(e, item.id)}
                                    className="p-0.5 hover:bg-gray-200 rounded text-gray-400"
                                  >
                                    {isCollapsed ? <ChevronRight size={14}/> : <ChevronDown size={14}/>}
                                  </button>
                                ) : (
                                  <span className="w-4"></span>
                                )}
                              </div>

                              {/* Icon Type */}
                              <div className="mr-2 flex-shrink-0">
                                {isSynthetic ? (
                                  <Folder size={16} className="text-orange-400 fill-orange-50"/> 
                                ) : (
                                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center text-[9px] font-bold ${item.databaseItem?.type === 'INSUMO' ? 'border-green-300 text-green-600 bg-green-50' : 'border-blue-300 text-blue-600 bg-blue-50'}`}>
                                    {item.databaseItem?.type === 'INSUMO' ? 'I' : 'C'}
                                  </div>
                                )}
                              </div>

                              {/* Level & Description */}
                              <div className="truncate flex gap-2 items-center">
                                <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1 rounded">{item.level}</span>
                                <span className={isSynthetic ? 'font-semibold' : ''}>{item.description}</span>
                              </div>
                           </div>
                           
                           <div className="col-span-2 flex justify-center">
                             <span className={`text-[9px] px-2 py-0.5 rounded-full border ${isSynthetic ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-gray-50 text-gray-500 border-gray-100'}`}>
                                {isSynthetic ? 'Etapa' : item.databaseItem?.type || 'Item'}
                             </span>
                           </div>
                        </div>
                      )
                    })}
                 </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-4">
                <Package size={64} strokeWidth={1} />
                <p>Escolha um bloco ao lado para ver os detalhes</p>
              </div>
            )}
          </div>
          
          {selectedBlock && (
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
               <div className="text-xs text-gray-400 mr-auto self-center max-w-[60%] flex items-center gap-2">
                  <div className="w-1 h-8 bg-orange-300 rounded-full"></div>
                  <div>
                    * Os itens são inseridos sem valores monetários.<br/>
                    Você precisará atualizar os custos conforme a referência atual.
                  </div>
               </div>
               <button 
                  disabled={!onInsertBlock}
                  onClick={() => onInsertBlock && onInsertBlock(selectedBlock)}
                  className={`px-4 py-2 text-white text-sm font-medium rounded shadow flex items-center gap-2 transition-colors ${onInsertBlock ? 'bg-orange-600 hover:bg-orange-700 cursor-pointer' : 'bg-gray-400 cursor-not-allowed'}`}
                >
                 <Download size={16}/> Inserir no Orçamento
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BlockLibraryModal;