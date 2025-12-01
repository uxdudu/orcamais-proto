import React from 'react';
import { 
  Clock, 
  FolderOpen, 
  Calculator, 
  ListTodo, 
  Building2, 
  Users, 
  MessageSquare,
  Settings,
  BookMarked
} from 'lucide-react';

interface SidebarProps {
  onOpenUserBase: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onOpenUserBase }) => {
  const iconClass = "w-6 h-6 text-gray-400 hover:text-white transition-colors cursor-pointer";
  
  return (
    <div className="h-screen w-16 bg-[#0f172a] flex flex-col items-center py-4 border-r border-gray-800 flex-shrink-0 z-20">
      <div className="mb-8">
        <img 
          src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%230f172a'/%3E%3Crect x='14' y='14' width='16' height='16' rx='4' fill='%23ffffff'/%3E%3Crect x='34' y='14' width='16' height='16' rx='4' fill='%23ffffff'/%3E%3Crect x='14' y='34' width='16' height='16' rx='4' fill='%23ffffff'/%3E%3Crect x='34' y='34' width='16' height='16' rx='4' fill='%23ea580c'/%3E%3C/svg%3E" 
          alt="Orçamais Logo" 
          className="w-10 h-10 hover:opacity-90 transition-opacity cursor-pointer"
        />
      </div>
      
      <div className="flex flex-col gap-6 flex-1 w-full items-center">
        <Clock className={iconClass} />
        <FolderOpen className="w-6 h-6 text-white cursor-pointer border-l-2 border-orange-500 pl-2 -ml-2.5" />
        <Calculator className={iconClass} />
        <div className="w-8 h-[1px] bg-gray-700 my-1"></div>
        <div title="Minha Base Própria" onClick={onOpenUserBase} className="cursor-pointer">
          <BookMarked 
            className={`${iconClass} hover:text-purple-400`} 
          />
        </div>
        <div className="w-8 h-[1px] bg-gray-700 my-1"></div>
        <ListTodo className={iconClass} />
        <Building2 className={iconClass} />
        <Users className={iconClass} />
      </div>

      <div className="flex flex-col gap-6 mb-4 w-full items-center">
        <div className="relative">
           <MessageSquare className={iconClass} />
           <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold">9</span>
        </div>
        <div className="relative">
            <Settings className={iconClass} />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0f172a]"></span>
        </div>
        <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-600 cursor-pointer">
          <img src="https://picsum.photos/100/100" alt="Profile" className="w-full h-full object-cover" />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;