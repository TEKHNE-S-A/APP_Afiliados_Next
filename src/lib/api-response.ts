import { NextResponse } from 'next/server'

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}

export function fail(status: number, error: string, message: string, issues?: unknown) {
  return NextResponse.json(
    {
      ok: false,
      error,
      message,
      ...(issues ? { issues } : {}),
    },
    { status },
  )
}

export function parsePagination(url: URL, defaults: { take?: number; maxTake?: number } = {}) {
  const takeDefault = defaults.take ?? 20
  const maxTake = defaults.maxTake ?? 100

  const takeRaw = Number(url.searchParams.get('take') ?? takeDefault)
  const skipRaw = Number(url.searchParams.get('skip') ?? 0)

  const take = Number.isFinite(takeRaw) ? Math.max(1, Math.min(maxTake, takeRaw)) : takeDefault
  const skip = Number.isFinite(skipRaw) ? Math.max(0, skipRaw) : 0

  return { take, skip }
}
