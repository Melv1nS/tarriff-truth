import React from 'react';
import { TariffCalculator } from './components/TariffCalculator';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-4xl mx-auto p-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 text-slate-800 tracking-tight">
            Tariff Impact Calculator
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Calculate how proposed tariffs would impact your household budget
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-amber-100">
          <TariffCalculator />
        </div>
      </div>
    </div>
  );
}
