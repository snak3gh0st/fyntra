"use server";

import { getCurrentAgent } from '@/lib/agent-context'
import { calculateMarketPremium, type MarketAgeBand } from '@/lib/policy-quote'

type TobaccoStatus = 'YES' | 'NO' | 'FORMER'

type QuoteProductCode = 'TERM_15' | 'TERM_20' | 'TERM_30' | 'IUL'

type QuoteEntry = {
  productCode: QuoteProductCode
  productLabel: string
  formulaLabel: string
  basePremium: number
  tobaccoFactor: number
  premium: number
}

type InsuredSnapshot = {
  firstName: string
  lastName: string
  dateOfBirth: string
  age: number
  tobaccoStatus: TobaccoStatus
}

type CreateIllustrationRequestResult =
  | {
      ok: true
      insured: InsuredSnapshot
      coverageAmount: number
      ageBand: MarketAgeBand
      tobaccoFactor: number
      quotes: QuoteEntry[]
      calculatedAt: string
    }
  | { ok: false; message: string }

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim()
}

function parseIntValue(value: string | null | undefined): number | null {
  if (!value) return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && Number.isFinite(parsed) ? parsed : null
}

function calculateAgeFromDOB(dob: Date): number {
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const hasBirthdayPassed =
    now.getMonth() > dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() >= dob.getDate())
  if (!hasBirthdayPassed) age -= 1
  return age
}

const BASE_COVERAGE_AMOUNT = 100_000

const ILLUSTRATION_PRODUCTS: Array<{
  code: QuoteProductCode
  productLabel: string
  productInput: string
}> = [
  { code: 'TERM_15', productLabel: 'Term 15', productInput: 'Term 15' },
  { code: 'TERM_20', productLabel: 'Term 20', productInput: 'Term 20' },
  { code: 'TERM_30', productLabel: 'Term 30', productInput: 'Term 30' },
  { code: 'IUL', productLabel: 'IUL', productInput: 'IUL' },
]

const TOBACCO_FACTORS: Record<TobaccoStatus, number> = {
  NO: 1,
  FORMER: 1.2,
  YES: 1.45,
}

function getAgeBandFromAge(age: number): MarketAgeBand {
  if (age <= 30) return 'AGE_18_30'
  if (age <= 45) return 'AGE_31_45'
  if (age <= 59) return 'AGE_46_59'
  return 'AGE_60_PLUS'
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2))
}

function buildIllustrationQuotes(ageBand: MarketAgeBand, tobaccoStatus: TobaccoStatus): QuoteEntry[] {
  return ILLUSTRATION_PRODUCTS.map(({ code, productLabel, productInput }) => {
    const quote = calculateMarketPremium({
      product: productInput,
      faceAmount: BASE_COVERAGE_AMOUNT,
      ageBand,
    })
    const tobaccoFactor = TOBACCO_FACTORS[tobaccoStatus]
    return {
      productCode: code,
      productLabel,
      formulaLabel: quote.formulaLabel,
      basePremium: quote.premium,
      tobaccoFactor,
      premium: roundMoney(quote.premium * tobaccoFactor),
    }
  })
}

export async function createIllustrationRequest(formData: FormData): Promise<CreateIllustrationRequestResult> {
  await getCurrentAgent()

  const firstName = normalizeText(formData.get('firstName') as string | null)
  const lastName = normalizeText(formData.get('lastName') as string | null)
  const dateOfBirthRaw = normalizeText(formData.get('dateOfBirth') as string | null)
  const age = parseIntValue(formData.get('age') as string | null)
  const tobaccoStatus = normalizeText(formData.get('tobaccoStatus') as string | null) as TobaccoStatus | ''

  if (!firstName) return { ok: false, message: 'Informe o nome.' }
  if (!lastName) return { ok: false, message: 'Informe o sobrenome.' }
  if (!dateOfBirthRaw) return { ok: false, message: 'Informe a data de nascimento (DOB).' }
  if (age === null || age < 0 || age > 120) return { ok: false, message: 'Informe uma idade válida entre 0 e 120.' }
  if (!['YES', 'NO', 'FORMER'].includes(tobaccoStatus)) {
    return { ok: false, message: 'Informe a situação de tabagismo.' }
  }

  const dateOfBirth = new Date(`${dateOfBirthRaw}T00:00:00.000Z`)
  if (Number.isNaN(dateOfBirth.getTime()) || dateOfBirth > new Date()) {
    return { ok: false, message: 'Data de nascimento inválida.' }
  }

  const inferredAge = calculateAgeFromDOB(dateOfBirth)
  if (Math.abs(inferredAge - age) > 1) {
    return {
      ok: false,
      message: `A idade informada (${age}) não bate com a DOB (${inferredAge} anos). Corrija antes de continuar.`,
    }
  }

  const insured: InsuredSnapshot = {
    firstName,
    lastName,
    dateOfBirth: dateOfBirthRaw,
    age,
    tobaccoStatus,
  }
  const ageBand = getAgeBandFromAge(age)

  const quotes = buildIllustrationQuotes(ageBand, tobaccoStatus)

  return {
    ok: true,
    insured,
    coverageAmount: BASE_COVERAGE_AMOUNT,
    ageBand,
    tobaccoFactor: TOBACCO_FACTORS[tobaccoStatus],
    quotes,
    calculatedAt: new Date().toISOString(),
  }
}
