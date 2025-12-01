import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BudgetTable from './components/BudgetTable';
import UserDatabaseModal from './components/UserDatabaseModal';
import { DatabaseItem } from './types';

const App: React.FC = () => {
  // State lifted from BudgetTable to manage User Database globally
  const [userDatabase, setUserDatabase] = useState<DatabaseItem[]>([]);
  const [isUserDbOpen, setIsUserDbOpen] = useState(false);

  const handleAddUserDbItem = (newItem: DatabaseItem) => {
    setUserDatabase(prev => [...prev, newItem]);
  };

  const handleDeleteUserDbItem = (id: string) => {
    setUserDatabase(prev => prev.filter(i => i.id !== id));
  };

  return (
    <div className="flex w-full h-screen bg-gray-100 overflow-hidden font-sans antialiased">
      {/* Sidebar now controls the User Database Modal */}
      <Sidebar onOpenUserBase={() => setIsUserDbOpen(true)} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <BudgetTable onAddToUserDb={handleAddUserDbItem} />
        </main>
      </div>

      {/* Global Modals rendered at App level */}
      <UserDatabaseModal
          isOpen={isUserDbOpen}
          items={userDatabase}
          onClose={() => setIsUserDbOpen(false)}
          onDeleteItem={handleDeleteUserDbItem}
       />
    </div>
  );
};

export default App;