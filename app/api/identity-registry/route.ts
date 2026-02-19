/**
 * Identity Registry API Route
 *
 * Simple tag→identityKey registry so users can associate human-readable
 * names (handles, social accounts, etc.) with their wallet identity keys.
 *
 * GET  ?action=lookup&query=<text>       → Search tags (substring match)
 * GET  ?action=list&identityKey=<key>    → List all tags for a given identity key
 * POST ?action=register   body: { tag, identityKey }  → Register a tag
 * POST ?action=revoke     body: { tag, identityKey }  → Remove a tag
 */

import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'

interface RegistryEntry {
  tag: string
  identityKey: string
  createdAt: string
}

const REGISTRY_FILE = join(process.cwd(), '.identity-registry.json')

function loadRegistry(): RegistryEntry[] {
  try {
    if (existsSync(REGISTRY_FILE)) {
      return JSON.parse(readFileSync(REGISTRY_FILE, 'utf-8'))
    }
  } catch {}
  return []
}

function saveRegistry(entries: RegistryEntry[]) {
  writeFileSync(REGISTRY_FILE, JSON.stringify(entries, null, 2))
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')

  try {
    if (action === 'lookup') {
      const query = (req.nextUrl.searchParams.get('query') || '').trim().toLowerCase()
      if (!query) {
        return NextResponse.json({ success: false, error: 'Missing query parameter' }, { status: 400 })
      }

      const entries = loadRegistry()
      const matches = entries.filter(e => e.tag.toLowerCase().includes(query))

      return NextResponse.json({
        success: true,
        query,
        results: matches.map(e => ({ tag: e.tag, identityKey: e.identityKey }))
      })
    }

    if (action === 'list') {
      const identityKey = req.nextUrl.searchParams.get('identityKey')
      if (!identityKey) {
        return NextResponse.json({ success: false, error: 'Missing identityKey parameter' }, { status: 400 })
      }

      const entries = loadRegistry()
      const mine = entries.filter(e => e.identityKey === identityKey)

      return NextResponse.json({
        success: true,
        tags: mine.map(e => ({ tag: e.tag, createdAt: e.createdAt }))
      })
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `${action} failed: ${(error as Error).message}`
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')

  try {
    const body = await req.json()
    const { tag, identityKey } = body as { tag?: string; identityKey?: string }

    if (!tag || !identityKey) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tag, identityKey' },
        { status: 400 }
      )
    }

    const normalizedTag = tag.trim()
    if (!normalizedTag) {
      return NextResponse.json({ success: false, error: 'Tag cannot be empty' }, { status: 400 })
    }

    const entries = loadRegistry()

    if (action === 'register') {
      // Check if this exact tag is already taken by a different key
      const existing = entries.find(e => e.tag.toLowerCase() === normalizedTag.toLowerCase())
      if (existing && existing.identityKey !== identityKey) {
        return NextResponse.json(
          { success: false, error: `Tag "${normalizedTag}" is already registered to another identity` },
          { status: 409 }
        )
      }

      // Check if this key already has this tag
      if (existing && existing.identityKey === identityKey) {
        return NextResponse.json({ success: true, message: 'Tag already registered', tag: normalizedTag })
      }

      entries.push({ tag: normalizedTag, identityKey, createdAt: new Date().toISOString() })
      saveRegistry(entries)

      return NextResponse.json({ success: true, message: 'Tag registered', tag: normalizedTag })
    }

    if (action === 'revoke') {
      const idx = entries.findIndex(
        e => e.tag.toLowerCase() === normalizedTag.toLowerCase() && e.identityKey === identityKey
      )
      if (idx === -1) {
        return NextResponse.json(
          { success: false, error: 'Tag not found or does not belong to this identity' },
          { status: 404 }
        )
      }

      entries.splice(idx, 1)
      saveRegistry(entries)

      return NextResponse.json({ success: true, message: 'Tag revoked', tag: normalizedTag })
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: `${action} failed: ${(error as Error).message}`
    }, { status: 500 })
  }
}
