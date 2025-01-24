import React from 'react'
import { TariffCalculator } from './components/TariffCalculator'

export default function Home(): React.ReactElement {
  return (
    <div className="min-h-screen bg-neutral-50 p-8 flex items-center justify-center">
      <main className="mx-auto max-w-4xl w-full flex flex-col items-center">
        <div className="w-full max-w-lg">
          <h1 className="mb-8 text-3xl font-bold text-neutral-800 text-center">
            Tariff Impact Calculator
          </h1>
          <p className="mb-8 text-center text-neutral-500">
            Calculate how proposed tariffs would impact your household budget
          </p>
          <TariffCalculator />
        </div>
      </main>
    </div>
  )
}
