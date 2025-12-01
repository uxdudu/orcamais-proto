import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  itemDescription: string;
  isSynthetic: boolean;
  childCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmationModal: React.FC<Props> = ({ 
  isOpen, 
  itemDescription, 
  isSynthetic, 
  childCount, 
  onClose, 
  onConfirm 
}) => {
  if (!isOpen) return null;

  const hasChildren = childCount > 0;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-200 overflow-hidden transform transition-all scale-100">
        
        {/* Header com cor de alerta se tiver filhos, ou cinza padrão */}
        <div className={`p-4 border-b flex items-center gap-3 ${hasChildren ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
          <div className={`p-2 rounded-full ${hasChildren ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
            {hasChildren ? <AlertTriangle size={20} /> : <Trash2 size={20} />}
          </div>
          <h3 className={`text-lg font-bold ${hasChildren ? 'text-red-900' : 'text-gray-800'}`}>
            {hasChildren ? 'Atenção: Exclusão em Cascata' : 'Confirmar Exclusão'}
          </h3>
          <button onClick={onClose} className="ml-auto text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-gray-700 text-sm">
            Você está prestes a excluir o item: <br/>
            <span className="font-semibold text-gray-900">"{itemDescription}"</span>
          </p>

          {hasChildren && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800 space-y-2">
              <p className="font-bold flex items-center gap-2">
                <AlertTriangle size={14} />
                Esta etapa possui {childCount} {childCount === 1 ? 'item vinculado' : 'itens vinculados'}.
              </p>
              <p className="leading-relaxed text-red-700">
                Ao confirmar, <strong>todos os itens e sub-etapas</strong> dentro desta estrutura serão removidos permanentemente.
              </p>
              <p className="font-bold text-xs uppercase tracking-wide mt-2">
                Esta ação não poderá ser desfeita.
              </p>
            </div>
          )}

          {!hasChildren && (
            <p className="text-sm text-gray-500">
              Tem certeza que deseja remover este item do orçamento?
            </p>
          )}
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors flex items-center gap-2 ${
              hasChildren 
                ? 'bg-red-600 hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2' 
                : 'bg-gray-900 hover:bg-gray-800'
            }`}
          >
            <Trash2 size={16} />
            {hasChildren ? 'Excluir Tudo' : 'Excluir Item'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;