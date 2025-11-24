import React from 'react';
import { AlertTriangle, ArrowRight, Calendar, Check } from 'lucide-react';
import { DatabaseItem } from '../types';

interface Props {
  isOpen: boolean;
  newItem: DatabaseItem | null;
  projectDate: string;
  onClose: () => void;
  onConfirm: (updateToBase: boolean) => void;
}

const VersionConflictModal: React.FC<Props> = ({ isOpen, newItem, projectDate, onClose, onConfirm }) => {
  if (!isOpen || !newItem) return null;

  const projectDateFormatted = new Date(projectDate).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const itemDateFormatted = new Date(newItem.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden">
        <div className="bg-orange-50 p-4 border-b border-orange-100 flex items-start gap-3">
          <div className="p-2 bg-orange-100 rounded-full text-orange-600 mt-0.5">
            <AlertTriangle size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Conflito de Versão Detectado</h3>
            <p className="text-sm text-gray-600 mt-1">
              O item selecionado pertence a uma base de dados mais recente do que a utilizada neste orçamento.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between gap-4 text-sm">
            <div className="flex-1 p-3 border border-gray-200 rounded-lg bg-gray-50">
              <div className="text-gray-500 mb-1">Referência do Projeto</div>
              <div className="font-semibold text-gray-900 flex items-center gap-2">
                <Calendar size={14} />
                {projectDateFormatted}
              </div>
            </div>
            
            <ArrowRight className="text-gray-400" />

            <div className="flex-1 p-3 border border-blue-200 rounded-lg bg-blue-50">
              <div className="text-blue-600 mb-1">Versão do Item</div>
              <div className="font-semibold text-blue-900 flex items-center gap-2">
                <Calendar size={14} />
                {itemDateFormatted}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded border border-gray-100 text-sm text-gray-600">
             <span className="font-medium text-gray-900">Item:</span> {newItem.code} - {newItem.description}
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onConfirm(false)}
            className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 rounded transition-colors"
          >
            Manter versão antiga
          </button>
          <button 
            onClick={() => onConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 rounded shadow-sm transition-colors flex items-center gap-2"
          >
            <Check size={16} />
            Atualizar Item
          </button>
        </div>
      </div>
    </div>
  );
};

export default VersionConflictModal;