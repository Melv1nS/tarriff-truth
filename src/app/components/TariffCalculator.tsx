'use client'

import React from 'react'
import { useState } from 'react'
import { StylesConfig, SingleValue } from 'react-select'
import { US_STATES, getStateOptions } from '@/app/constants/states'
import { ClientSelect } from './ClientSelect'
import { calculateTariffImpact } from '@/app/lib/calculations'

const TARIFF_COUNTRIES = {
    CANADA: 'Canada',
    MEXICO: 'Mexico',
    CHINA: 'China'
} as const

// Convert objects to options format for react-select
const STATE_OPTIONS = getStateOptions()

const COUNTRY_OPTIONS = Object.entries(TARIFF_COUNTRIES).map(([, name]) => ({
    value: name,
    label: name
}))

interface FormData {
    householdIncome: string
    state: keyof typeof US_STATES
    tariffPercentage: string
    tariffCountry: string
}

interface FormErrors {
    householdIncome?: string
    tariffPercentage?: string
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
    'Transportation': 0.16,
    'Housing & Utilities': 0.33,
    'Healthcare': 0.08,
    'Entertainment': 0.05,
    'Clothing': 0.03,
    'Electronics': 0.02,
    'Other Goods': 0.20
} as const

const BASE_PRICES = {
    'Groceries & Food': 100,      // Base monthly spending unit
    'Transportation': 150,
    'Housing & Utilities': 300,
    'Healthcare': 200,
    'Entertainment': 80,
    'Clothing': 60,
    'Electronics': 100,
    'Other Goods': 150
} as const;

interface SelectOption {
    value: string
    label: string
}

export function TariffCalculator(): React.ReactElement {
    const [formData, setFormData] = useState<FormData>({
        householdIncome: '',
        state: 'AL',
        tariffPercentage: '',
        tariffCountry: TARIFF_COUNTRIES.CANADA
    })

    const [formErrors, setFormErrors] = useState<FormErrors>({})
    const [isCalculating, setIsCalculating] = useState(false)
    const [calculationResults, setCalculationResults] = useState<CalculationResults | null>(null)

    function validateForm(): boolean {
        const errors: FormErrors = {}
        let isValid = true

        if (!formData.householdIncome) {
            errors.householdIncome = 'Please enter your household income'
            isValid = false
        } else if (parseFloat(formData.householdIncome) <= 0) {
            errors.householdIncome = 'Income must be greater than 0'
            isValid = false
        }

        if (!formData.tariffPercentage) {
            errors.tariffPercentage = 'Please enter a tariff percentage'
            isValid = false
        } else {
            const percentage = parseFloat(formData.tariffPercentage)
            if (percentage < 0 || percentage > 100) {
                errors.tariffPercentage = 'Percentage must be between 0 and 100'
                isValid = false
            }
        }

        setFormErrors(errors)
        return isValid
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
                        monthlyIncome * percentage
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
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
        // Clear error when user starts typing
        if (formErrors[name as keyof FormErrors]) {
            setFormErrors(prev => ({
                ...prev,
                [name]: undefined
            }))
        }
    }

    function handleStateChange(newValue: SingleValue<SelectOption>): void {
        if (newValue) {
            setFormData(prev => ({
                ...prev,
                state: newValue.value as keyof typeof US_STATES
            }))
        }
    }

    function handleCountryChange(newValue: SingleValue<SelectOption>): void {
        if (newValue) {
            setFormData(prev => ({
                ...prev,
                tariffCountry: newValue.value
            }))
        }
    }

    const customStyles: StylesConfig<SelectOption> = {
        control: (base) => ({
            ...base,
            borderColor: 'rgb(229, 229, 229)',
            padding: '2px',
            '&:hover': {
                borderColor: 'rgb(229, 229, 229)'
            }
        }),
        option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? 'rgb(251, 191, 36, 0.1)' : 'white',
            color: 'rgb(38, 38, 38)',
            '&:active': {
                backgroundColor: 'rgb(251, 191, 36, 0.2)'
            }
        }),
        input: (base) => ({
            ...base,
            color: 'rgb(38, 38, 38)'
        })
    }

    return (
        <div className="w-full max-w-lg space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label htmlFor="householdIncome" className="block text-sm font-medium text-neutral-800">
                        Household Income
                    </label>
                    <input
                        type="number"
                        id="householdIncome"
                        name="householdIncome"
                        value={formData.householdIncome}
                        onChange={handleInputChange}
                        className={`w-full rounded-md border p-2 focus:ring-1 focus:ring-amber-500 text-neutral-800 placeholder-neutral-400 ${formErrors.householdIncome
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-neutral-200 focus:border-amber-500'
                            }`}
                        placeholder="Enter annual household income"
                        required
                    />
                    {formErrors.householdIncome && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.householdIncome}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label htmlFor="state" className="block text-sm font-medium text-neutral-800">
                        State
                    </label>
                    <ClientSelect<SelectOption>
                        inputId="state"
                        instanceId="state-select"
                        name="state"
                        options={STATE_OPTIONS}
                        value={STATE_OPTIONS.find(option => option.value === formData.state)}
                        onChange={handleStateChange}
                        styles={customStyles}
                        className="text-neutral-800"
                        placeholder="Search for a state..."
                        required
                        aria-label="Select state"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="tariffPercentage" className="block text-sm font-medium text-neutral-800">
                        Tariff Percentage
                    </label>
                    <input
                        type="number"
                        id="tariffPercentage"
                        name="tariffPercentage"
                        value={formData.tariffPercentage}
                        onChange={handleInputChange}
                        className={`w-full rounded-md border p-2 focus:ring-1 focus:ring-amber-500 text-neutral-800 placeholder-neutral-400 ${formErrors.tariffPercentage
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-neutral-200 focus:border-amber-500'
                            }`}
                        placeholder="Enter tariff percentage"
                        min="0"
                        max="100"
                        required
                    />
                    {formErrors.tariffPercentage && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.tariffPercentage}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label htmlFor="tariffCountry" className="block text-sm font-medium text-neutral-800">
                        Country
                    </label>
                    <ClientSelect<SelectOption>
                        inputId="country"
                        instanceId="country-select"
                        name="tariffCountry"
                        options={COUNTRY_OPTIONS}
                        value={COUNTRY_OPTIONS.find(option => option.value === formData.tariffCountry)}
                        onChange={handleCountryChange}
                        styles={customStyles}
                        className="text-neutral-800"
                        placeholder="Select country..."
                        required
                        aria-label="Select country"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isCalculating}
                    className="w-full rounded-md bg-amber-600 px-4 py-2 text-white hover:bg-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed relative"
                >
                    {isCalculating ? (
                        <div className="flex items-center justify-center">
                            <div className="animate-spin h-5 w-5 mr-3">
                                <svg className="h-full w-full text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                            Calculating...
                        </div>
                    ) : (
                        'Calculate Impact'
                    )}
                </button>
            </form>

            {calculationResults && (
                <div className="mt-8 space-y-6">
                    <h2 className="text-xl font-semibold mb-4 text-neutral-800">
                        Estimated Annual Impact: ${calculationResults.totalImpact.toLocaleString()}
                    </h2>

                    <div className="space-y-4">
                        {Object.entries(calculationResults.categoryImpacts).map(([category, { impact, representativeItems }]) => (
                            <div key={category} className="bg-base-200 p-4 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-medium text-neutral-700">{category}</h3>
                                    <p className="text-lg font-semibold text-amber-600">+${impact.toLocaleString()}</p>
                                </div>
                                {representativeItems.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        <p className="text-sm text-neutral-600 font-medium">Example Items:</p>
                                        <div className="pl-4 space-y-2">
                                            {representativeItems.map((item, idx) => (
                                                <div key={idx} className="text-sm">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-neutral-700">{item.name}</span>
                                                        <span className="text-amber-600 font-medium">+${item.impact.toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-neutral-500 text-xs mt-0.5">{item.explanation}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
} 