"use server";

import { getCurrentAgent } from '@/lib/agent-context'

type TobaccoStatus = 'YES' | 'NO' | 'FORMER'

type CreateIllustrationRequestResult =
  | { ok: true; requestUrl: string }
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

  const rawIllustrationRequestUrl = process.env.ILLUSTRATION_REQUEST_URL
  if (!rawIllustrationRequestUrl) {
    return { ok: false, message: 'ILLUSTRATION_REQUEST_URL não está configurada no ambiente.' }
  }

  try {
    const u = new URL(rawIllustrationRequestUrl)
    u.searchParams.set('firstName', firstName)
    u.searchParams.set('lastName', lastName)
    u.searchParams.set('dateOfBirth', dateOfBirthRaw)
    u.searchParams.set('age', String(age))
    u.searchParams.set('tobaccoStatus', tobaccoStatus)
    return { ok: true, requestUrl: u.toString() }
  } catch {
    return { ok: false, message: 'Url de solicitação de ilustração inválida.' }
  }
}

