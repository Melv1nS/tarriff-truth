'use client';

import React from 'react';
import { useState } from 'react';
import { StylesConfig, SingleValue } from 'react-select';
import { US_STATES, getStateOptions } from '@/app/constants/states';
import { ClientSelect } from './ClientSelect';
import { calculateTariffImpact } from '@/app/lib/calculations';

const TARIFF_COUNTRIES = {
  CANADA: 'Canada',
  MEXICO: 'Mexico',
  CHINA: 'China',
} as const;

// Convert objects to options format for react-select
const STATE_OPTIONS = getStateOptions();

const COUNTRY_OPTIONS = Object.entries(TARIFF_COUNTRIES).map(([, name]) => ({
  value: name,
  label: name,
}));

interface FormData {
  householdIncome: string;
  state: keyof typeof US_STATES;
  tariffPercentage: string;
  tariffCountry: string;
}

interface FormErrors {
  householdIncome?: string;
  tariffPercentage?: string;
}

interface CalculationResults {
  totalImpact: number;
  categoryImpacts: {
    [key: string]: {
      impact: number;
      representativeItems: Array<{
        name: string;
        impact: number;
        explanation: string;
      }>;
    };
  };
}

const SPENDING_CATEGORIES = {
  'Groceries & Food': 0.13,
  Transportation: 0.16,
  'Housing & Utilities': 0.33,
  Healthcare: 0.08,
  Entertainment: 0.05,
  Clothing: 0.03,
  Electronics: 0.02,
  'Other Goods': 0.2,
} as const;

const BASE_PRICES = {
  'Groceries & Food': 100, // Base monthly spending unit
  Transportation: 150,
  'Housing & Utilities': 300,
  Healthcare: 200,
  Entertainment: 80,
  Clothing: 60,
  Electronics: 100,
  'Other Goods': 150,
} as const;

interface SelectOption {
  value: string;
  label: string;
}

export function TariffCalculator(): React.ReactElement {
  const [formData, setFormData] = useState<FormData>({
    householdIncome: '',
    state: 'AL',
    tariffPercentage: '',
    tariffCountry: TARIFF_COUNTRIES.CANADA,
  });

  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResults, setCalculationResults] = useState<CalculationResults | null>(null);

  function validateForm(): boolean {
    const errors: FormErrors = {};
    let isValid = true;

    if (!formData.householdIncome) {
      errors.householdIncome = 'Please enter your household income';
      isValid = false;
    } else if (parseFloat(formData.householdIncome) <= 0) {
      errors.householdIncome = 'Income must be greater than 0';
      isValid = false;
    }

    if (!formData.tariffPercentage) {
      errors.tariffPercentage = 'Please enter a tariff percentage';
      isValid = false;
    } else {
      const percentage = parseFloat(formData.tariffPercentage);
      if (percentage < 0 || percentage > 100) {
        errors.tariffPercentage = 'Percentage must be between 0 and 100';
        isValid = false;
      }
    }

    setFormErrors(errors);
    return isValid;
  }

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const income = parseFloat(formData.householdIncome);
    const tariffPercentage = parseFloat(formData.tariffPercentage);

    if (!isNaN(income) && !isNaN(tariffPercentage)) {
      setIsCalculating(true);
      try {
        // Calculate spending patterns based on income
        const monthlyIncome = income / 12;
        const spendingPatterns = Object.fromEntries(
          Object.entries(SPENDING_CATEGORIES).map(([category, percentage]) => [
            category,
            monthlyIncome * percentage,
          ])
        );

        // Calculate tariff impact with real-time commodity data and state-specific factors
        const results = await calculateTariffImpact(
          BASE_PRICES,
          tariffPercentage,
          spendingPatterns,
          formData.state,
          formData.tariffCountry
        );

        setCalculationResults(results);
      } catch (error) {
        console.error('Calculation error:', error);
        setCalculationResults(null);
      } finally {
        setIsCalculating(false);
      }
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error when user starts typing
    if (formErrors[name as keyof FormErrors]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  }

  function handleStateChange(newValue: SingleValue<SelectOption>): void {
    if (newValue) {
      setFormData((prev) => ({
        ...prev,
        state: newValue.value as keyof typeof US_STATES,
      }));
    }
  }

  function handleCountryChange(newValue: SingleValue<SelectOption>): void {
    if (newValue) {
      setFormData((prev) => ({
        ...prev,
        tariffCountry: newValue.value,
      }));
    }
  }

  const customStyles: StylesConfig<SelectOption> = {
    control: (base) => ({
      ...base,
      minHeight: '42px',
      borderRadius: '0.5rem',
      borderColor: 'rgb(226, 232, 240)',
      boxShadow: 'none',
      '&:hover': {
        borderColor: 'rgb(226, 232, 240)',
      },
      padding: '2px',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isFocused ? 'rgb(255, 251, 235)' : 'white',
      color: 'rgb(51, 65, 85)',
      '&:active': {
        backgroundColor: 'rgb(254, 243, 199)',
      },
    }),
    input: (base) => ({
      ...base,
      color: 'rgb(51, 65, 85)',
    }),
    singleValue: (base) => ({
      ...base,
      color: 'rgb(51, 65, 85)',
    }),
  };

  return (
    <div className="w-full space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="householdIncome" className="form-label">
            Household Income
          </label>
          <input
            type="number"
            id="householdIncome"
            name="householdIncome"
            value={formData.householdIncome}
            onChange={handleInputChange}
            className={`form-input ${
              formErrors.householdIncome ? 'border-red-500 focus:border-red-500' : ''
            }`}
            placeholder="Enter annual household income"
            required
          />
          {formErrors.householdIncome && (
            <p className="mt-1 text-sm text-red-600">{formErrors.householdIncome}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="state" className="form-label">
            State
          </label>
          <ClientSelect<SelectOption>
            inputId="state"
            instanceId="state-select"
            name="state"
            options={STATE_OPTIONS}
            value={STATE_OPTIONS.find((option) => option.value === formData.state)}
            onChange={handleStateChange}
            styles={customStyles}
            className="form-select"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="tariffPercentage" className="form-label">
            Tariff Percentage
          </label>
          <input
            type="number"
            id="tariffPercentage"
            name="tariffPercentage"
            value={formData.tariffPercentage}
            onChange={handleInputChange}
            className={`form-input ${
              formErrors.tariffPercentage ? 'border-red-500 focus:border-red-500' : ''
            }`}
            placeholder="Enter tariff percentage"
            required
          />
          {formErrors.tariffPercentage && (
            <p className="mt-1 text-sm text-red-600">{formErrors.tariffPercentage}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="country" className="form-label">
            Country
          </label>
          <ClientSelect<SelectOption>
            inputId="country"
            instanceId="country-select"
            name="country"
            options={COUNTRY_OPTIONS}
            value={COUNTRY_OPTIONS.find((option) => option.value === formData.tariffCountry)}
            onChange={handleCountryChange}
            styles={customStyles}
            className="form-select"
          />
        </div>

        <button type="submit" disabled={isCalculating} className="btn-primary">
          {isCalculating ? 'Calculating...' : 'Calculate Impact'}
        </button>
      </form>

      {calculationResults && (
        <div className="mt-8 p-6 bg-amber-50 rounded-lg border border-amber-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-4">Calculation Results</h2>
          <div className="space-y-4">
            {Object.entries(calculationResults.categoryImpacts).map(
              ([category, { impact, representativeItems }]) => (
                <div key={category} className="bg-base-200 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium text-neutral-700">{category}</h3>
                    <p className="text-lg font-semibold text-amber-600">
                      +${impact.toLocaleString()}
                    </p>
                  </div>
                  {representativeItems.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm text-neutral-600 font-medium">Example Items:</p>
                      <div className="pl-4 space-y-2">
                        {representativeItems.map((item, idx) => (
                          <div key={idx} className="text-sm">
                            <div className="flex justify-between items-center">
                              <span className="text-neutral-700">{item.name}</span>
                              <span className="text-amber-600 font-medium">
                                +${item.impact.toLocaleString()}
                              </span>
                            </div>
                            <p className="text-neutral-500 text-xs mt-0.5">{item.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
