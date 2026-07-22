"use server";

import { getCurrentAgent } from '@/lib/agent-context'

type TobaccoStatus = 'YES' | 'NO' | 'FORMER'
type RequestMethod = 'GET' | 'POST'

type RequestPayload = {
  firstName: string
  lastName: string
  dateOfBirth: string
  age: number
  tobaccoStatus: TobaccoStatus
}

type CreateIllustrationRequestResult =
  | {
      ok: true
      requestUrl: string | null
      requestQuery: string
      requestPayload: RequestPayload
      submitted: boolean
      executionMessage: string
      executionStatusCode: number | null
      partnerResponseSnippet?: string
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

function parseRequestMethod(): RequestMethod {
  const rawMethod = process.env.ILLUSTRATION_REQUEST_METHOD?.trim().toUpperCase()
  return rawMethod === 'POST' ? 'POST' : 'GET'
}

function parseRequestTimeoutMs(): number {
  const rawTimeout = process.env.ILLUSTRATION_REQUEST_TIMEOUT_MS
  if (!rawTimeout) return 12000

  const parsed = Number.parseInt(rawTimeout, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return 12000
  return Math.max(3000, parsed)
}

function buildQueryString(payload: RequestPayload): string {
  return new URLSearchParams({
    firstName: payload.firstName,
    lastName: payload.lastName,
    dateOfBirth: payload.dateOfBirth,
    age: String(payload.age),
    tobaccoStatus: payload.tobaccoStatus,
  }).toString()
}

function snippet(text: string, maxLength = 600): string {
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 3)}...`
}

async function requestIllustrationFromProvider(payload: RequestPayload): Promise<{
  requestUrl: string | null
  executionMessage: string
  executionStatusCode: number | null
  partnerResponseSnippet: string | null
  submitted: boolean
  requestQuery: string
}> {
  const rawUrl = process.env.ILLUSTRATION_REQUEST_URL?.trim()
  const requestQuery = buildQueryString(payload)

  if (!rawUrl) {
    return {
      requestUrl: null,
      executionMessage: 'ILLUSTRATION_REQUEST_URL não está definida. O payload abaixo está pronto para envio manual.',
      executionStatusCode: null,
      partnerResponseSnippet: null,
      submitted: false,
      requestQuery,
    }
  }

  if (parseRequestMethod() === 'GET') {
    const u = new URL(rawUrl)
    u.searchParams.set('firstName', payload.firstName)
    u.searchParams.set('lastName', payload.lastName)
    u.searchParams.set('dateOfBirth', payload.dateOfBirth)
    u.searchParams.set('age', String(payload.age))
    u.searchParams.set('tobaccoStatus', payload.tobaccoStatus)
    return {
      requestUrl: u.toString(),
      executionMessage: 'URL de solicitação preparada no padrão GET.',
      executionStatusCode: null,
      partnerResponseSnippet: null,
      submitted: false,
      requestQuery,
    }
  }

  const controller = new AbortController()
  const timeout = parseRequestTimeoutMs()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const authToken = process.env.ILLUSTRATION_REQUEST_AUTH_TOKEN?.trim()
    const authHeader = process.env.ILLUSTRATION_REQUEST_AUTH_HEADER?.trim()
    const useBearer = process.env.ILLUSTRATION_REQUEST_AUTH_BEARER?.trim()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    }

    if (authToken) {
      if (authHeader) {
        headers[authHeader] = authToken
      } else if (useBearer === '1' || useBearer?.toLowerCase() === 'true') {
        headers.Authorization = `Bearer ${authToken}`
      } else {
        headers['X-Api-Key'] = authToken
      }
    }

    const response = await fetch(rawUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    const rawResponse = await response.text()
    const contentType = response.headers.get('content-type') ?? ''
    const locationHeader = response.headers.get('location')
    const responseSnippet = rawResponse ? snippet(rawResponse) : null

    if (!response.ok) {
      throw new Error(
        `Falha na resposta do parceiro: ${response.status} ${response.statusText}${
          responseSnippet ? ` — ${responseSnippet}` : ''
        }`,
      )
    }

    let partnerUrl: string | null = null
    if (contentType.includes('application/json')) {
      try {
        const parsed = JSON.parse(rawResponse) as { url?: string; requestUrl?: string; nextUrl?: string }
        partnerUrl = parsed.url ?? parsed.requestUrl ?? parsed.nextUrl ?? null
      } catch {}
    }
    if (!partnerUrl && locationHeader) {
      partnerUrl = locationHeader
    }

    return {
      requestUrl: partnerUrl ?? rawUrl,
      executionMessage: `Solicitação enviada via POST com sucesso (${response.status}).`,
      executionStatusCode: response.status,
      partnerResponseSnippet: responseSnippet,
      submitted: true,
      requestQuery,
    }
  } finally {
    clearTimeout(timer)
  }
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

  const requestPayload: RequestPayload = {
    firstName,
    lastName,
    dateOfBirth: dateOfBirthRaw,
    age,
    tobaccoStatus,
  }

  try {
    const result = await requestIllustrationFromProvider(requestPayload)
    return {
      ok: true,
      requestUrl: result.requestUrl,
      requestQuery: result.requestQuery,
      requestPayload,
      submitted: result.submitted,
      executionMessage: result.executionMessage,
      executionStatusCode: result.executionStatusCode,
      partnerResponseSnippet: result.partnerResponseSnippet ?? undefined,
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { ok: false, message: 'Tempo limite para contato com parceiro encerrado antes da resposta.' }
      }
      return { ok: false, message: error.message }
    }

    return { ok: false, message: 'Falha desconhecida ao solicitar ilustração.' }
  }
}
