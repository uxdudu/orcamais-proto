import React from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import BudgetTable from './components/BudgetTable';

const App: React.FC = () => {
  return (
    <div className="flex w-full h-screen bg-gray-100 overflow-hidden font-sans antialiased">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 flex flex-col relative overflow-hidden">
          <BudgetTable />
        </main>
      </div>
    </div>
  );
};

export default App;