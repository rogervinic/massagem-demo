import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { DB } from './types'
import type { Session } from './api'
import { buildSeed, DB_VERSION } from './seed'

const DB_KEY = 'salvia-demo-db'
const SESSION_KEY = 'salvia-demo-session'

function loadDb(): DB | null {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (!raw) return null
    const db = JSON.parse(raw) as DB
    return db.version === DB_VERSION ? db : null
  } catch {
    return null
  }
}

function saveDb(db: DB) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    /* armazenamento indisponível: segue só em memória */
  }
}

interface StoreCtx {
  db: DB
  session: Session | null
  setSession: (s: Session | null) => void
  /** Executa uma mutação, persiste e re-renderiza. Repassa erros ao chamador. */
  run: <T>(fn: (db: DB) => T) => T
  runAsync: <T>(fn: (db: DB) => Promise<T>) => Promise<T>
  resetDemo: () => Promise<void>
}

const Ctx = createContext<StoreCtx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB | null>(null)
  const [tick, setTick] = useState(0)
  const [session, setSessionState] = useState<Session | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null')
    } catch {
      return null
    }
  })

  useEffect(() => {
    const existing = loadDb()
    if (existing) setDb(existing)
    else buildSeed().then((s) => { saveDb(s); setDb(s) })
  }, [])

  const setSession = useCallback((s: Session | null) => {
    setSessionState(s)
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
      else localStorage.removeItem(SESSION_KEY)
    } catch { /* ignora */ }
  }, [])

  const value = useMemo<StoreCtx | null>(() => {
    if (!db) return null
    return {
      db,
      session,
      setSession,
      run: (fn) => {
        const r = fn(db)
        saveDb(db)
        setTick((t) => t + 1)
        return r
      },
      runAsync: async (fn) => {
        const r = await fn(db)
        saveDb(db)
        setTick((t) => t + 1)
        return r
      },
      resetDemo: async () => {
        const fresh = await buildSeed()
        saveDb(fresh)
        setSession(null)
        setDb(fresh)
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, session, setSession, tick])

  if (!value)
    return (
      <div className="min-h-screen grid place-items-center text-bark-500 text-sm">Preparando a demonstração…</div>
    )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const c = useContext(Ctx)
  if (!c) throw new Error('StoreProvider ausente')
  return c
}
