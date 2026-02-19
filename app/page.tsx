'use client'

import { useState, useEffect } from 'react'
import { Wallet, Overlay, Certifier, DID, createWallet, toVerifiableCredential } from '@bsv/simplifier/browser'

export default function TestSimplifyPage() {
  const [wallet, setWallet] = useState<any | null>(null)
  const [status, setStatus] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [certifier, setCertifier] = useState<any | null>(null)
  const [isCertified, setIsCertified] = useState(false)
  const [certSerial, setCertSerial] = useState<string | null>(null)
  const [serverWalletCreated, setServerWalletCreated] = useState(false)
  const [serverFunded, setServerFunded] = useState(false)
  const [serverIdentityKey, setServerIdentityKey] = useState<string | null>(null)
  const [messageBoxHandle, setMessageBoxHandle] = useState<string | null>(null)
  const [incomingPayments, setIncomingPayments] = useState<any[]>([])

  const REGISTRY_URL = '/api/identity-registry'

  // Check for saved server wallet on mount
  useEffect(() => {
    fetch('/api/server-wallet?action=status')
      .then(r => r.json())
      .then(data => {
        if (data.success && data.saved) {
          setServerWalletCreated(true)
          setServerIdentityKey(data.identityKey || null)
          setStatus(`Saved server wallet found: ${data.identityKey?.substring(0, 20) || '?'}...`)
        }
      })
      .catch(() => {})
  }, [])

  // ============================================================================
  // Wallet Connection
  // ============================================================================
  const handleConnectWallet = async () => {
    setLoading(true)
    setStatus('Connecting to wallet...')
    try {
      const w = await createWallet()
      setWallet(w)
      const st = w.getStatus()

      // Auto-check MessageBox certification
      const handle = await w.getMessageBoxHandle(REGISTRY_URL)
      if (handle) {
        setMessageBoxHandle(handle)
        setStatus(`Connected as "${handle}"! Identity: ${st.identityKey?.substring(0, 20)}...`)
      } else {
        setStatus(`Connected! Identity: ${st.identityKey?.substring(0, 20)}...`)
      }

      addResult({
        type: 'wallet',
        action: 'connect',
        success: true,
        data: { ...st, messageBoxHandle: handle }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'wallet', action: 'connect', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Wallet Info
  // ============================================================================
  const handleWalletInfo = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Fetching wallet info...')
    try {
      const info = wallet.getWalletInfo()

      // Also derive a BRC-29 payment key as an example
      const paymentKey = await wallet.derivePublicKey(
        [2, '3241645161d8'],
        'example-key-id',
        'anyone'
      )

      setStatus(`Wallet: ${info.identityKey.substring(0, 20)}... | Address: ${info.address}`)
      addResult({
        type: 'wallet',
        action: 'info',
        success: true,
        data: {
          identityKey: info.identityKey,
          address: info.address,
          network: info.network,
          isConnected: info.connected,
          derivedPaymentKey: paymentKey.substring(0, 40) + '...'
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'wallet', action: 'info', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Simple Payment
  // ============================================================================
  const handleSimplePayment = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Creating simple payment...')
    try {
      const result = await wallet.pay({
        to: wallet.getIdentityKey(),
        satoshis: 1000,
        memo: 'Test payment from simplifier!',
        basket: 'test-simple-payment',
        changeBasket: 'recovered-change'
      })
      const reint = result.reinternalized
      setStatus(`Payment created! TXID: ${result.txid.substring(0, 20)}... | Recovered: ${reint?.count ?? 0} orphaned output(s)`)
      addResult({
        type: 'payment',
        action: 'simple-pay',
        success: true,
        data: {
          txid: result.txid,
          outputs: result.outputs?.length,
          reinternalized: reint
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'payment', action: 'simple-pay', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Multi-Output Send
  // ============================================================================
  const handleMultiOutputSend = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Creating multi-output transaction...')
    try {
      const result = await wallet.send({
        outputs: [
          { to: wallet.getIdentityKey(), satoshis: 1000 },
          { data: ['simplifier-test', JSON.stringify({ ts: Date.now() })] },
          { to: wallet.getIdentityKey(), data: ['test-field'], satoshis: 1 }
        ],
        description: 'Multi-output test',
        changeBasket: 'recovered-change'
      })
      const reint = result.reinternalized
      setStatus(`Multi-output TX created! TXID: ${result.txid.substring(0, 20)}... | ${result.outputDetails.length} outputs | Recovered: ${reint?.count ?? 0} orphaned output(s)`)
      addResult({
        type: 'payment',
        action: 'multi-output-send',
        success: true,
        data: {
          txid: result.txid,
          outputDetails: result.outputDetails,
          reinternalized: reint
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'payment', action: 'multi-output-send', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Create Token
  // ============================================================================
  const handleCreateToken = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Creating token...')
    try {
      const result = await wallet.createToken({
        to: wallet.getIdentityKey(),
        data: { type: 'test-token', value: 100, timestamp: Date.now() },
        basket: 'test-tokens'
      })
      setStatus(`Token created! TXID: ${result.txid.substring(0, 20)}...`)
      addResult({
        type: 'token',
        action: 'create',
        success: true,
        data: { txid: result.txid, basket: result.basket }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'token', action: 'create', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // List Token Details
  // ============================================================================
  const handleListTokenDetails = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Decoding tokens...')
    try {
      const details = await wallet.listTokenDetails('test-tokens')
      setStatus(`Found ${details.length} token(s) in test-tokens basket`)
      addResult({
        type: 'token',
        action: 'list-details',
        success: true,
        data: {
          count: details.length,
          tokens: details.slice(0, 10).map((t: any) => ({
            outpoint: t.outpoint,
            satoshis: t.satoshis,
            data: t.data,
            hasDerivationInfo: !!(t.protocolID && t.keyID)
          }))
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'token', action: 'list-details', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Send Token
  // ============================================================================
  const handleSendToken = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    const outpoint = prompt('Enter token outpoint (txid.outputIndex):')
    if (!outpoint?.trim()) return
    const recipient = prompt('Recipient identity key (leave blank to send to self):', '')
    const to = recipient?.trim() || wallet.getIdentityKey()

    setLoading(true)
    setStatus(`Sending token ${outpoint.trim().substring(0, 20)}...`)
    try {
      const result = await wallet.sendToken({
        basket: 'test-tokens',
        outpoint: outpoint.trim(),
        to
      })
      setStatus(`Token sent! TXID: ${result.txid.substring(0, 20)}...`)
      addResult({
        type: 'token',
        action: 'send',
        success: true,
        data: { txid: result.txid, outpoint: outpoint.trim(), to: to.substring(0, 30) + '...' }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'token', action: 'send', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Send Token via MessageBox
  // ============================================================================
  const handleSendTokenMessageBox = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    const outpoint = prompt('Enter token outpoint (txid.outputIndex):')
    if (!outpoint?.trim()) return

    // Search by handle or paste key
    const query = prompt('Recipient handle or identity key:')
    if (!query?.trim()) return
    const trimmed = query.trim()

    let recipientKey: string
    if (/^[0-9a-fA-F]{66}$/.test(trimmed)) {
      recipientKey = trimmed
    } else {
      setLoading(true)
      setStatus(`Searching for "${trimmed}"...`)
      try {
        const results = await wallet.lookupIdentityByTag(trimmed, REGISTRY_URL)
        if (results.length === 0) { setStatus(`No identities found for "${trimmed}"`); setLoading(false); return }
        if (results.length === 1) {
          recipientKey = results[0].identityKey
        } else {
          const list = results.map((r: any, i: number) => `${i + 1}. ${r.tag}  (${r.identityKey.substring(0, 16)}...)`).join('\n')
          setLoading(false)
          const pick = prompt(`Found ${results.length} match(es):\n${list}\n\nEnter number:`)
          if (!pick) return
          const idx = parseInt(pick, 10) - 1
          if (isNaN(idx) || idx < 0 || idx >= results.length) { setStatus('Invalid selection'); return }
          recipientKey = results[idx].identityKey
        }
      } catch (error) {
        setStatus(`Error: ${(error as Error).message}`)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setStatus(`Sending token via MessageBox to ${recipientKey.substring(0, 20)}...`)
    try {
      const result = await wallet.sendTokenViaMessageBox({
        basket: 'test-tokens',
        outpoint: outpoint.trim(),
        to: recipientKey
      })
      setStatus(`Token sent via MessageBox! TXID: ${result.txid.substring(0, 20)}...`)
      addResult({
        type: 'token',
        action: 'send-messagebox',
        success: true,
        data: { txid: result.txid, outpoint: outpoint.trim(), to: recipientKey.substring(0, 30) + '...' }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'token', action: 'send-messagebox', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // List Incoming Tokens (MessageBox)
  // ============================================================================
  const [incomingTokens, setIncomingTokens] = useState<any[]>([])

  const handleListIncomingTokens = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Checking token inbox...')
    try {
      const tokens = await wallet.listIncomingTokens()
      setIncomingTokens(tokens)
      setStatus(`Found ${tokens.length} incoming token(s)`)
      addResult({
        type: 'token',
        action: 'list-incoming',
        success: true,
        data: {
          count: tokens.length,
          tokens: tokens.slice(0, 5).map((t: any) => ({
            messageId: t.messageId,
            sender: t.sender?.substring(0, 20) + '...',
            keyID: t.keyID
          }))
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'token', action: 'list-incoming', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Accept Incoming Token (MessageBox)
  // ============================================================================
  const handleAcceptIncomingToken = async () => {
    if (!wallet || incomingTokens.length === 0) { setStatus('No incoming tokens to accept'); return }
    setLoading(true)
    setStatus('Accepting incoming token...')
    try {
      const token = incomingTokens[0]
      const result = await wallet.acceptIncomingToken(token, 'test-tokens')
      setIncomingTokens(prev => prev.slice(1))
      setStatus('Token accepted and stored in test-tokens basket!')
      addResult({
        type: 'token',
        action: 'accept-incoming',
        success: true,
        data: {
          messageId: token.messageId,
          sender: token.sender?.substring(0, 20) + '...',
          basket: result.basket
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'token', action: 'accept-incoming', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Redeem Token
  // ============================================================================
  const handleRedeemToken = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    const outpoint = prompt('Enter token outpoint to redeem (txid.outputIndex):')
    if (!outpoint?.trim()) return

    setLoading(true)
    setStatus(`Redeeming token ${outpoint.trim().substring(0, 20)}...`)
    try {
      const result = await wallet.redeemToken({
        basket: 'test-tokens',
        outpoint: outpoint.trim()
      })
      setStatus(`Token redeemed! TXID: ${result.txid.substring(0, 20)}... — sats released`)
      addResult({
        type: 'token',
        action: 'redeem',
        success: true,
        data: { txid: result.txid, outpoint: outpoint.trim() }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'token', action: 'redeem', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Create Inscription
  // ============================================================================
  const handleCreateInscription = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Creating inscription...')
    try {
      const result = await wallet.inscribeText('Hello from BSV Simplifier! ' + new Date().toISOString())
      setStatus(`Inscription created! TXID: ${result.txid.substring(0, 20)}...`)
      addResult({
        type: 'inscription',
        action: 'text',
        success: true,
        data: { txid: result.txid, type: result.type, size: result.dataSize }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'inscription', action: 'text', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Overlay: Create
  // ============================================================================
  const [overlay, setOverlayInstance] = useState<any | null>(null)

  const handleCreateOverlay = async () => {
    setLoading(true)
    setStatus('Creating overlay with SHIP/SLAP...')
    try {
      const o = await Overlay.create({
        topics: ['tm_test'],
        network: 'mainnet'
      })
      setOverlayInstance(o)
      const info = o.getInfo()
      setStatus(`Overlay created! Topics: ${info.topics.join(', ')} | Network: ${info.network}`)
      addResult({ type: 'overlay', action: 'create', success: true, data: info })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'overlay', action: 'create', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Overlay: Query Lookup
  // ============================================================================
  const handleQueryLookup = async () => {
    if (!overlay) { setStatus('Create overlay first'); return }
    setLoading(true)
    setStatus('Querying SHIP lookup service...')
    try {
      const answer = await overlay.query('ls_ship', { topics: ['tm_test'] })
      const outputCount = answer?.outputs?.length ?? 0
      setStatus(`Lookup returned ${outputCount} output(s)`)
      addResult({
        type: 'overlay',
        action: 'query-lookup',
        success: true,
        data: {
          type: answer.type,
          outputCount,
          outputs: answer.outputs?.slice(0, 5).map((o: any) => ({
            outputIndex: o.outputIndex,
            beefLength: o.beef?.length
          }))
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'overlay', action: 'query-lookup', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Overlay: Advertise SHIP
  // ============================================================================
  const handleAdvertiseSHIP = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    const domain = prompt('Enter your domain (e.g. myapp.example.com):')
    if (!domain?.trim()) return
    setLoading(true)
    setStatus(`Advertising SHIP for tm_test at ${domain.trim()}...`)
    try {
      const result = await wallet.advertiseSHIP(domain.trim(), 'tm_test', 'overlay-tokens')
      setStatus(`SHIP advertised! TXID: ${result.txid.substring(0, 20)}...`)
      addResult({
        type: 'overlay',
        action: 'advertise-ship',
        success: true,
        data: { txid: result.txid, domain: domain.trim(), topic: 'tm_test' }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'overlay', action: 'advertise-ship', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Overlay: Advertise SLAP
  // ============================================================================
  const handleAdvertiseSLAP = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    const domain = prompt('Enter your domain (e.g. myapp.example.com):')
    if (!domain?.trim()) return
    setLoading(true)
    setStatus(`Advertising SLAP for ls_test at ${domain.trim()}...`)
    try {
      const result = await wallet.advertiseSLAP(domain.trim(), 'ls_test', 'overlay-tokens')
      setStatus(`SLAP advertised! TXID: ${result.txid.substring(0, 20)}...`)
      addResult({
        type: 'overlay',
        action: 'advertise-slap',
        success: true,
        data: { txid: result.txid, domain: domain.trim(), service: 'ls_test' }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'overlay', action: 'advertise-slap', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Certifier
  // ============================================================================
  const handleLaunchCertifier = async () => {
    setLoading(true)
    setStatus('Launching certifier...')
    try {
      const c = await Certifier.create()
      setCertifier(c)
      const info = c.getInfo()
      setStatus(`Certifier launched! Key: ${info.publicKey.substring(0, 20)}...`)
      addResult({
        type: 'certifier',
        action: 'create',
        success: true,
        data: { publicKey: info.publicKey.substring(0, 40) + '...', certificateType: info.certificateType }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'certifier', action: 'create', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  const handleGetCertified = async () => {
    if (!wallet || !certifier) { setStatus('Connect wallet and launch certifier first'); return }
    setLoading(true)
    setStatus('Issuing certificate...')
    try {
      const certData = await certifier.certify(wallet)
      setIsCertified(true)
      setCertSerial(certData.serialNumber)
      setStatus(`Certified! Serial: ${certData.serialNumber.substring(0, 20)}...`)
      addResult({
        type: 'certification',
        action: 'certify',
        success: true,
        data: { serialNumber: certData.serialNumber, certifier: certData.certifier?.substring(0, 20) + '...' }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'certification', action: 'certify', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeCertificate = async () => {
    if (!wallet || !isCertified || !certSerial || !certifier) { setStatus('No certificate to revoke'); return }
    setLoading(true)
    setStatus('Revoking certificate...')
    try {
      const info = certifier.getInfo()
      await wallet.relinquishCert({
        type: info.certificateType,
        serialNumber: certSerial,
        certifier: info.publicKey
      })
      setIsCertified(false)
      setCertSerial(null)
      setStatus('Certificate revoked')
      addResult({ type: 'certification', action: 'revoke', success: true, data: { serialNumber: certSerial } })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'certification', action: 'revoke', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Server Wallet: Create
  // ============================================================================
  const handleCreateServerWallet = async () => {
    setLoading(true)
    setStatus('Creating server wallet...')
    try {
      const res = await fetch('/api/server-wallet?action=create')
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setServerWalletCreated(true)
      setServerIdentityKey(data.serverIdentityKey)
      setStatus(`Server wallet created! Identity: ${data.serverIdentityKey.substring(0, 20)}...`)
      addResult({
        type: 'server-wallet',
        action: 'create',
        success: true,
        data: {
          serverIdentityKey: data.serverIdentityKey,
          saved: true,
          ...data.status
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'server-wallet', action: 'create', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Server Wallet: Fund
  // ============================================================================
  const handleFundServerWallet = async () => {
    if (!wallet) { setStatus('Please connect desktop wallet first'); return }
    setLoading(true)
    setStatus('Requesting payment from server wallet...')
    try {
      // Step 1: Get payment request
      const reqRes = await fetch('/api/server-wallet?action=request')
      const reqData = await reqRes.json()
      if (!reqData.success) throw new Error(reqData.error)

      const paymentRequest = reqData.paymentRequest
      setStatus(`Got request for ${paymentRequest.satoshis} sats. Funding...`)

      // Step 2: Fund with BRC-29 derived payment
      const result = await wallet.fundServerWallet(paymentRequest, 'test-simple-server-payment', 'recovered-change')
      setStatus('Payment created. Sending to server for internalization...')

      // Step 3: Send tx back to server
      const receiveRes = await fetch('/api/server-wallet?action=receive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx: Array.from(result.tx),
          senderIdentityKey: wallet.getIdentityKey(),
          derivationPrefix: paymentRequest.derivationPrefix,
          derivationSuffix: paymentRequest.derivationSuffix,
          outputIndex: 0
        })
      })
      const receiveData = await receiveRes.json()
      if (!receiveData.success) throw new Error(receiveData.error)

      setServerFunded(true)
      const reint = result.reinternalized
      setStatus(`Server wallet funded! TXID: ${result.txid.substring(0, 20)}... | Recovered: ${reint?.count ?? 0} orphaned output(s)`)
      addResult({
        type: 'server-wallet',
        action: 'fund',
        success: true,
        data: {
          txid: result.txid,
          satoshis: paymentRequest.satoshis,
          serverIdentityKey: reqData.serverIdentityKey?.substring(0, 30) + '...',
          memo: paymentRequest.memo,
          reinternalized: reint
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'server-wallet', action: 'fund', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Desktop Wallet: Balance (across app baskets)
  // ============================================================================
  const APP_BASKETS = [
    'test-simple-payment',
    'test-simple-server-payment',
    'test-simple-messagebox-payment',
    'test-simple-reinternalize-outputs',
    'recovered-change',
    'test-tokens', 'text', 'json'
  ]

  const handleDesktopBalance = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Fetching desktop wallet balance...')
    try {
      const client = wallet.getClient()
      const basketResults: Record<string, { outputs: number; satoshis: number }> = {}
      let grandTotal = 0
      let grandOutputs = 0

      for (const basket of APP_BASKETS) {
        try {
          const raw = await client.listOutputs({ basket, include: 'locking scripts' })
          const outputList = raw?.outputs ?? (Array.isArray(raw) ? raw : [])
          const satoshis = outputList.reduce((sum: number, o: any) => sum + (o.satoshis || 0), 0)
          if (outputList.length > 0) {
            basketResults[basket] = { outputs: outputList.length, satoshis }
            grandTotal += satoshis
            grandOutputs += outputList.length
          }
        } catch {
          // Basket may not exist yet — skip
        }
      }

      const basketCount = Object.keys(basketResults).length
      setStatus(
        basketCount > 0
          ? `App outputs: ${grandOutputs} across ${basketCount} basket(s), ${grandTotal} sats`
          : 'No app outputs yet. Create tokens or inscriptions first.'
      )
      addResult({
        type: 'desktop-wallet',
        action: 'balance',
        success: true,
        data: {
          baskets: basketResults,
          totalOutputs: grandOutputs,
          totalSatoshis: grandTotal
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'desktop-wallet', action: 'balance', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Server Wallet: Balance
  // ============================================================================
  const handleServerBalance = async () => {
    if (!serverWalletCreated) { setStatus('Create server wallet first'); return }
    setLoading(true)
    setStatus('Fetching server wallet balance...')
    try {
      const res = await fetch('/api/server-wallet?action=balance')
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setStatus(`Server balance: ${data.spendableSatoshis} sats (${data.spendableOutputs} spendable outputs)`)
      addResult({
        type: 'server-wallet',
        action: 'balance',
        success: true,
        data
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'server-wallet', action: 'balance', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Desktop Wallet: List Outputs (across app baskets)
  // ============================================================================
  const handleDesktopOutputs = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Listing desktop wallet outputs...')
    try {
      const client = wallet.getClient()
      const allOutputs: any[] = []

      for (const basket of APP_BASKETS) {
        try {
          const raw = await client.listOutputs({ basket, include: 'locking scripts' })
          const outputList = raw?.outputs ?? (Array.isArray(raw) ? raw : [])
          for (const o of outputList) {
            allOutputs.push({
              basket,
              outpoint: o.outpoint,
              satoshis: o.satoshis,
              spendable: o.spendable
            })
          }
        } catch {
          // Basket may not exist yet — skip
        }
      }

      setStatus(
        allOutputs.length > 0
          ? `Desktop wallet: ${allOutputs.length} app outputs`
          : 'No app outputs yet. Create tokens or inscriptions first.'
      )
      addResult({
        type: 'desktop-wallet',
        action: 'list-outputs',
        success: true,
        data: {
          totalOutputs: allOutputs.length,
          outputs: allOutputs.slice(0, 20)
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'desktop-wallet', action: 'list-outputs', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Server Wallet: List Outputs
  // ============================================================================
  const handleServerOutputs = async () => {
    if (!serverWalletCreated) { setStatus('Create server wallet first'); return }
    setLoading(true)
    setStatus('Listing server wallet outputs...')
    try {
      const res = await fetch('/api/server-wallet?action=outputs')
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setStatus(`Server wallet: ${data.totalOutputs} outputs in default basket`)
      addResult({
        type: 'server-wallet',
        action: 'list-outputs',
        success: true,
        data
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'server-wallet', action: 'list-outputs', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Server Wallet: Reset
  // ============================================================================
  const handleResetServerWallet = async () => {
    setLoading(true)
    setStatus('Resetting server wallet...')
    try {
      const res = await fetch('/api/server-wallet?action=reset')
      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      setServerWalletCreated(false)
      setServerFunded(false)
      setServerIdentityKey(null)
      setStatus('Server wallet reset. You can create a new one.')
      addResult({ type: 'server-wallet', action: 'reset', success: true, data: { message: 'Wallet deleted' } })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'server-wallet', action: 'reset', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // MessageBox: Certify (one-time: handle + anointHost + registry)
  // ============================================================================
  const handleCertifyMessageBox = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    const handle = prompt('Choose your handle (name, @tag, social account, etc.):')
    if (!handle?.trim()) return
    setLoading(true)
    setStatus(`Certifying as "${handle.trim()}"...`)
    try {
      const result = await wallet.certifyForMessageBox(handle.trim(), REGISTRY_URL)
      setMessageBoxHandle(result.handle)
      setStatus(`Certified as "${result.handle}"! TXID: ${result.txid?.substring(0, 20) || 'ok'}...`)
      addResult({
        type: 'messagebox',
        action: 'certify',
        success: true,
        data: { handle: result.handle, txid: result.txid }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'messagebox', action: 'certify', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // MessageBox: Revoke certification (remove handle + clear state)
  // ============================================================================
  const handleRevokeMessageBox = async () => {
    if (!wallet || !messageBoxHandle) { setStatus('Not certified'); return }
    setLoading(true)
    setStatus(`Revoking certification "${messageBoxHandle}"...`)
    try {
      await wallet.revokeMessageBoxCertification(REGISTRY_URL)
      const revokedHandle = messageBoxHandle
      setMessageBoxHandle(null)
      setIncomingPayments([])
      setStatus(`Certification "${revokedHandle}" revoked. You are no longer discoverable.`)
      addResult({
        type: 'messagebox',
        action: 'revoke',
        success: true,
        data: { handle: revokedHandle }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'messagebox', action: 'revoke', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // MessageBox: Send Payment (search by handle → select → pay)
  // ============================================================================
  const handleSendMessageBoxPayment = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }

    const query = prompt('Search recipient by handle / name (or paste an identity key directly):')
    if (!query?.trim()) return
    const trimmed = query.trim()

    let recipientKey: string

    // If it looks like a hex public key (66 chars hex), use it directly
    if (/^[0-9a-fA-F]{66}$/.test(trimmed)) {
      recipientKey = trimmed
    } else {
      // Search registry by handle
      setLoading(true)
      setStatus(`Searching for "${trimmed}"...`)
      try {
        const results = await wallet.lookupIdentityByTag(trimmed, REGISTRY_URL)
        if (results.length === 0) {
          setStatus(`No identities found for "${trimmed}"`)
          setLoading(false)
          return
        }

        if (results.length === 1) {
          // Single match — use directly
          recipientKey = results[0].identityKey
          setStatus(`Found "${results[0].tag}" — preparing payment...`)
        } else {
          // Multiple matches — let user pick
          const list = results.map((r: any, i: number) => `${i + 1}. ${r.tag}  (${r.identityKey.substring(0, 16)}...)`).join('\n')
          setLoading(false)
          const pick = prompt(`Found ${results.length} match(es):\n${list}\n\nEnter number to pay:`)
          if (!pick) return
          const pickIdx = parseInt(pick, 10) - 1
          if (isNaN(pickIdx) || pickIdx < 0 || pickIdx >= results.length) {
            setStatus('Invalid selection')
            return
          }
          recipientKey = results[pickIdx].identityKey
        }
      } catch (error) {
        setStatus(`Error: ${(error as Error).message}`)
        addResult({ type: 'messagebox', action: 'send-payment', success: false, error: (error as Error).message })
        setLoading(false)
        return
      }
    }

    const amountStr = prompt('Amount in satoshis:', '1000')
    const satoshis = parseInt(amountStr || '1000', 10)
    if (isNaN(satoshis) || satoshis <= 0) { setStatus('Invalid amount'); return }

    setLoading(true)
    setStatus(`Sending ${satoshis} sats via MessageBox to ${recipientKey.substring(0, 20)}...`)
    try {
      const result = await wallet.sendMessageBoxPayment(recipientKey, satoshis, 'recovered-change')
      setStatus(`MessageBox payment sent! ${satoshis} sats | Recovered: ${result.reinternalized?.count ?? 0} orphaned output(s)`)
      addResult({
        type: 'messagebox',
        action: 'send-payment',
        success: true,
        data: {
          recipient: recipientKey.substring(0, 30) + '...',
          satoshis,
          reinternalized: result.reinternalized
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'messagebox', action: 'send-payment', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  const handleListIncoming = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Checking MessageBox inbox...')
    try {
      const payments = await wallet.listIncomingPayments()
      setIncomingPayments(payments)
      setStatus(`Found ${payments.length} incoming payment(s)`)
      addResult({
        type: 'messagebox',
        action: 'list-incoming',
        success: true,
        data: {
          count: payments.length,
          payments: payments.slice(0, 5).map((p: any) => ({
            messageId: p.messageId,
            sender: p.sender?.substring(0, 20) + '...',
            amount: p.token?.amount
          }))
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'messagebox', action: 'list-incoming', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptPayment = async () => {
    if (!wallet || incomingPayments.length === 0) { setStatus('No incoming payments to accept'); return }
    setLoading(true)
    setStatus('Accepting incoming payment...')
    try {
      const payment = incomingPayments[0]
      const result = await wallet.acceptIncomingPayment(payment, 'test-simple-messagebox-payment')
      setIncomingPayments(prev => prev.slice(1))
      setStatus('Payment accepted and internalized!')
      addResult({
        type: 'messagebox',
        action: 'accept-payment',
        success: true,
        data: {
          messageId: payment.messageId,
          sender: payment.sender?.substring(0, 20) + '...',
          amount: payment.token?.amount,
          result
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'messagebox', action: 'accept-payment', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // DID: Get DID Document
  // ============================================================================
  const handleGetDID = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Generating DID Document...')
    try {
      const didDoc = wallet.getDID()
      setStatus(`DID: ${didDoc.id}`)
      addResult({
        type: 'did',
        action: 'get-did',
        success: true,
        data: didDoc
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'did', action: 'get-did', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // DID: Register DID (persist as certificate)
  // ============================================================================
  const handleRegisterDID = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    setLoading(true)
    setStatus('Registering DID as certificate...')
    try {
      const didDoc = await wallet.registerDID({ persist: true })
      setStatus(`DID registered! ${didDoc.id}`)
      addResult({
        type: 'did',
        action: 'register-did',
        success: true,
        data: { id: didDoc.id, controller: didDoc.controller }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'did', action: 'register-did', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // DID: Resolve DID
  // ============================================================================
  const handleResolveDID = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    const didString = prompt('Enter did:bsv:<identityKey> to resolve:', `did:bsv:${wallet.getIdentityKey()}`)
    if (!didString?.trim()) return
    setLoading(true)
    setStatus(`Resolving ${didString.trim().substring(0, 30)}...`)
    try {
      const didDoc = wallet.resolveDID(didString.trim())
      setStatus(`Resolved: ${didDoc.id}`)
      addResult({
        type: 'did',
        action: 'resolve-did',
        success: true,
        data: didDoc
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'did', action: 'resolve-did', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // VC: Issue Verifiable Credential (local certifier + W3C wrapper)
  // ============================================================================
  const handleIssueVC = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    if (!certifier) { setStatus('Launch certifier first'); return }
    setLoading(true)
    setStatus('Issuing Verifiable Credential...')
    try {
      const certData = await certifier.certify(wallet, { role: 'tester', verified: 'true' })
      const vc = toVerifiableCredential(certData, certifier.getInfo().publicKey, { credentialType: 'TestCredential' })
      setStatus(`VC issued! Type: ${vc.type.join(', ')}`)
      addResult({
        type: 'vc',
        action: 'issue',
        success: true,
        data: {
          type: vc.type,
          issuer: vc.issuer,
          subject: vc.credentialSubject.id,
          issuanceDate: vc.issuanceDate,
          fields: vc.credentialSubject,
          proof: { type: vc.proof.type, verificationMethod: vc.proof.verificationMethod }
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'vc', action: 'issue', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // VC: List Credentials (as W3C VCs)
  // ============================================================================
  const handleListCredentials = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    if (!certifier) { setStatus('Launch certifier first'); return }
    setLoading(true)
    setStatus('Listing credentials as W3C VCs...')
    try {
      const info = certifier.getInfo()
      const vcs = await wallet.listCredentials({
        certifiers: [info.publicKey],
        types: [info.certificateType]
      })
      setStatus(`Found ${vcs.length} Verifiable Credential(s)`)
      addResult({
        type: 'vc',
        action: 'list',
        success: true,
        data: {
          count: vcs.length,
          credentials: vcs.slice(0, 5).map((vc: any) => ({
            type: vc.type,
            issuer: vc.issuer,
            subject: vc.credentialSubject?.id,
            issuanceDate: vc.issuanceDate,
            hasRevocationStatus: !!vc.credentialStatus
          }))
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'vc', action: 'list', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // VC: Create Verifiable Presentation
  // ============================================================================
  const handleCreatePresentation = async () => {
    if (!wallet) { setStatus('Please connect wallet first'); return }
    if (!certifier) { setStatus('Launch certifier first'); return }
    setLoading(true)
    setStatus('Creating Verifiable Presentation...')
    try {
      const info = certifier.getInfo()
      const vcs = await wallet.listCredentials({
        certifiers: [info.publicKey],
        types: [info.certificateType]
      })
      if (vcs.length === 0) {
        setStatus('No credentials to present. Issue a VC first.')
        setLoading(false)
        return
      }
      const vp = wallet.createPresentation(vcs)
      setStatus(`Presentation created with ${vp.verifiableCredential.length} credential(s)`)
      addResult({
        type: 'vc',
        action: 'presentation',
        success: true,
        data: {
          type: vp.type,
          holder: vp.holder,
          credentialCount: vp.verifiableCredential.length,
          proof: { type: vp.proof.type, proofPurpose: vp.proof.proofPurpose }
        }
      })
    } catch (error) {
      setStatus(`Error: ${(error as Error).message}`)
      addResult({ type: 'vc', action: 'presentation', success: false, error: (error as Error).message })
    } finally {
      setLoading(false)
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================
  const addResult = (result: any) => {
    setResults(prev => [
      { ...result, timestamp: new Date().toLocaleTimeString() },
      ...prev
    ].slice(0, 20))
  }

  // Button style helpers
  const btnBase = 'rounded-lg p-6 border-2 shadow-xl hover:shadow-2xl transition-all disabled:cursor-not-allowed disabled:opacity-60 hover:scale-105 transform'
  const btnPurple = `bg-gradient-to-br from-purple-400 to-indigo-500 hover:from-purple-300 hover:to-indigo-400 disabled:from-purple-700 disabled:to-indigo-800 border-purple-300/50 hover:border-purple-200 disabled:border-purple-600 ${btnBase}`
  const btnCyan = `bg-gradient-to-br from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 disabled:from-purple-700 disabled:to-indigo-800 border-cyan-300/50 hover:border-cyan-200 disabled:border-purple-600 ${btnBase}`
  const btnAmber = `bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:from-purple-700 disabled:to-indigo-800 border-amber-300/50 hover:border-amber-200 disabled:border-purple-600 ${btnBase}`
  const btnGreen = `bg-gradient-to-br from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 disabled:from-purple-700 disabled:to-indigo-800 border-emerald-300/50 hover:border-emerald-200 disabled:border-purple-600 ${btnBase}`
  const btnRed = `bg-gradient-to-br from-red-400 to-rose-500 hover:from-red-300 hover:to-rose-400 disabled:from-purple-700 disabled:to-indigo-800 border-red-300/50 hover:border-red-200 disabled:border-purple-600 ${btnBase}`

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            BSV Simplifier
          </h1>
          <p className="text-white/90 text-lg">Interactive Test Suite</p>
        </div>

        {/* Status Bar */}
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-6 border border-white/30">
          <div className="flex items-center gap-3">
            {loading && (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            )}
            <p className="text-white flex-1">
              {status || 'Ready to test! Connect your wallet to begin...'}
            </p>
          </div>
        </div>

        {/* ================================================================ */}
        {/* Desktop Wallet Actions */}
        {/* ================================================================ */}
        <h2 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Desktop Wallet</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button onClick={handleConnectWallet} disabled={loading || wallet !== null} className={btnPurple}>
            <div className="text-4xl mb-2">🔗</div>
            <h3 className="text-white font-bold mb-1">Connect Wallet</h3>
            <p className="text-white/90 text-sm">Initialize wallet connection</p>
          </button>

          <button onClick={handleWalletInfo} disabled={loading || !wallet} className={btnGreen}>
            <div className="text-4xl mb-2">ℹ️</div>
            <h3 className="text-white font-bold mb-1">Wallet Info</h3>
            <p className="text-white/90 text-sm">Identity key, address, derivations</p>
          </button>

          <button onClick={handleSimplePayment} disabled={loading || !wallet} className={btnPurple}>
            <div className="text-4xl mb-2">💸</div>
            <h3 className="text-white font-bold mb-1">Simple Payment</h3>
            <p className="text-white/90 text-sm">wallet.pay() with memo</p>
          </button>

          <button onClick={handleMultiOutputSend} disabled={loading || !wallet} className={btnPurple}>
            <div className="text-4xl mb-2">📦</div>
            <h3 className="text-white font-bold mb-1">Multi-Output Send</h3>
            <p className="text-white/90 text-sm">wallet.send() P2PKH+OP_RETURN+PushDrop</p>
          </button>

          <button onClick={handleCreateToken} disabled={loading || !wallet} className={btnPurple}>
            <div className="text-4xl mb-2">🪙</div>
            <h3 className="text-white font-bold mb-1">Create Token</h3>
            <p className="text-white/90 text-sm">wallet.createToken()</p>
          </button>

          <button onClick={handleListTokenDetails} disabled={loading || !wallet} className={btnGreen}>
            <div className="text-4xl mb-2">🔍</div>
            <h3 className="text-white font-bold mb-1">List Token Details</h3>
            <p className="text-white/90 text-sm">wallet.listTokenDetails()</p>
          </button>

          <button onClick={handleSendToken} disabled={loading || !wallet} className={btnAmber}>
            <div className="text-4xl mb-2">📤</div>
            <h3 className="text-white font-bold mb-1">Send Token</h3>
            <p className="text-white/90 text-sm">wallet.sendToken()</p>
          </button>

          <button onClick={handleRedeemToken} disabled={loading || !wallet} className={btnRed}>
            <div className="text-4xl mb-2">🔥</div>
            <h3 className="text-white font-bold mb-1">Redeem Token</h3>
            <p className="text-white/90 text-sm">wallet.redeemToken()</p>
          </button>

          <button onClick={handleCreateInscription} disabled={loading || !wallet} className={btnPurple}>
            <div className="text-4xl mb-2">📝</div>
            <h3 className="text-white font-bold mb-1">Create Inscription</h3>
            <p className="text-white/90 text-sm">wallet.inscribeText()</p>
          </button>

          <button onClick={handleDesktopBalance} disabled={loading || !wallet} className={btnGreen}>
            <div className="text-4xl mb-2">💰</div>
            <h3 className="text-white font-bold mb-1">App Balance</h3>
            <p className="text-white/90 text-sm">Sum across app baskets</p>
          </button>

          <button onClick={handleDesktopOutputs} disabled={loading || !wallet} className={btnGreen}>
            <div className="text-4xl mb-2">📋</div>
            <h3 className="text-white font-bold mb-1">App Outputs</h3>
            <p className="text-white/90 text-sm">List app basket outputs</p>
          </button>
        </div>

        {/* ================================================================ */}
        {/* Token MessageBox */}
        {/* ================================================================ */}
        <h2 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
          Token MessageBox
          {incomingTokens.length > 0 && (
            <span className="ml-2 text-xs text-amber-300">{incomingTokens.length} pending</span>
          )}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button onClick={handleSendTokenMessageBox} disabled={loading || !wallet} className={btnAmber}>
            <div className="text-4xl mb-2">📤</div>
            <h3 className="text-white font-bold mb-1">Send Token (MessageBox)</h3>
            <p className="text-white/90 text-sm">
              {!wallet ? 'Connect wallet first' : 'Send token to recipient via MessageBox'}
            </p>
          </button>

          <button onClick={handleListIncomingTokens} disabled={loading || !wallet} className={btnAmber}>
            <div className="text-4xl mb-2">📥</div>
            <h3 className="text-white font-bold mb-1">Check Token Inbox</h3>
            <p className="text-white/90 text-sm">
              {!wallet ? 'Connect wallet first' : 'List incoming tokens'}
            </p>
          </button>

          <button onClick={handleAcceptIncomingToken} disabled={loading || !wallet || incomingTokens.length === 0} className={btnGreen}>
            <div className="text-4xl mb-2">✅</div>
            <h3 className="text-white font-bold mb-1">Accept Token</h3>
            <p className="text-white/90 text-sm">
              {incomingTokens.length > 0
                ? `Accept first of ${incomingTokens.length} pending`
                : 'No pending tokens'}
            </p>
          </button>
        </div>

        {/* ================================================================ */}
        {/* Server Wallet Actions */}
        {/* ================================================================ */}
        <h2 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
          Server Wallet
          {serverIdentityKey && (
            <span className="ml-2 font-mono text-xs text-white/50">
              {serverIdentityKey.substring(0, 16)}...
            </span>
          )}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button onClick={handleCreateServerWallet} disabled={loading || serverWalletCreated} className={btnCyan}>
            <div className="text-4xl mb-2">🏦</div>
            <h3 className="text-white font-bold mb-1">
              {serverWalletCreated ? 'Server Wallet Active' : 'Create Server Wallet'}
            </h3>
            <p className="text-white/90 text-sm">
              {serverWalletCreated ? 'Saved & loaded' : 'ServerWallet.create()'}
            </p>
          </button>

          <button onClick={handleFundServerWallet} disabled={loading || !wallet || !serverWalletCreated} className={btnCyan}>
            <div className="text-4xl mb-2">💳</div>
            <h3 className="text-white font-bold mb-1">
              {serverFunded ? 'Fund Again' : 'Fund Server Wallet'}
            </h3>
            <p className="text-white/90 text-sm">
              {!serverWalletCreated
                ? 'Create server wallet first'
                : !wallet
                  ? 'Connect desktop wallet first'
                  : 'wallet.fundServerWallet()'}
            </p>
          </button>

          <button onClick={handleServerBalance} disabled={loading || !serverWalletCreated} className={btnCyan}>
            <div className="text-4xl mb-2">💰</div>
            <h3 className="text-white font-bold mb-1">Server Balance</h3>
            <p className="text-white/90 text-sm">Sum of default basket</p>
          </button>

          <button onClick={handleServerOutputs} disabled={loading || !serverWalletCreated} className={btnCyan}>
            <div className="text-4xl mb-2">📋</div>
            <h3 className="text-white font-bold mb-1">Server Outputs</h3>
            <p className="text-white/90 text-sm">listOutputs('default')</p>
          </button>

          <button onClick={handleResetServerWallet} disabled={loading || !serverWalletCreated} className={btnRed}>
            <div className="text-4xl mb-2">🔄</div>
            <h3 className="text-white font-bold mb-1">Reset Server Wallet</h3>
            <p className="text-white/90 text-sm">Delete saved key & start fresh</p>
          </button>
        </div>

        {/* ================================================================ */}
        {/* MessageBox Payments */}
        {/* ================================================================ */}
        <h2 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
          MessageBox Payments
          {messageBoxHandle && (
            <span className="ml-2 text-xs text-emerald-300">Certified as &quot;{messageBoxHandle}&quot;</span>
          )}
          {incomingPayments.length > 0 && (
            <span className="ml-2 text-xs text-amber-300">{incomingPayments.length} pending</span>
          )}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button onClick={handleCertifyMessageBox} disabled={loading || !wallet || !!messageBoxHandle} className={btnAmber}>
            <div className="text-4xl mb-2">📡</div>
            <h3 className="text-white font-bold mb-1">
              {messageBoxHandle ? `"${messageBoxHandle}"` : 'Certify Identity'}
            </h3>
            <p className="text-white/90 text-sm">
              {!wallet
                ? 'Connect wallet first'
                : messageBoxHandle
                  ? 'Already certified'
                  : 'Choose a handle & register'}
            </p>
          </button>

          <button onClick={handleSendMessageBoxPayment} disabled={loading || !wallet || !messageBoxHandle} className={btnAmber}>
            <div className="text-4xl mb-2">📨</div>
            <h3 className="text-white font-bold mb-1">Send Payment</h3>
            <p className="text-white/90 text-sm">
              {!messageBoxHandle ? 'Certify first' : 'Search by handle or paste key'}
            </p>
          </button>

          <button onClick={handleListIncoming} disabled={loading || !wallet || !messageBoxHandle} className={btnAmber}>
            <div className="text-4xl mb-2">📥</div>
            <h3 className="text-white font-bold mb-1">Check Inbox</h3>
            <p className="text-white/90 text-sm">
              {!messageBoxHandle ? 'Certify first' : 'List incoming payments'}
            </p>
          </button>

          <button onClick={handleAcceptPayment} disabled={loading || !wallet || incomingPayments.length === 0} className={btnGreen}>
            <div className="text-4xl mb-2">✅</div>
            <h3 className="text-white font-bold mb-1">Accept Payment</h3>
            <p className="text-white/90 text-sm">
              {incomingPayments.length > 0
                ? `Collect first of ${incomingPayments.length} pending`
                : 'No pending payments'}
            </p>
          </button>

          <button onClick={handleRevokeMessageBox} disabled={loading || !wallet || !messageBoxHandle} className={btnRed}>
            <div className="text-4xl mb-2">🚫</div>
            <h3 className="text-white font-bold mb-1">Revoke Certification</h3>
            <p className="text-white/90 text-sm">
              {!messageBoxHandle ? 'Not certified' : `Remove "${messageBoxHandle}" & disconnect`}
            </p>
          </button>
        </div>

        {/* ================================================================ */}
        {/* Certification Actions */}
        {/* ================================================================ */}
        <h2 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">
          Overlay (SHIP/SLAP)
          {overlay && <span className="ml-2 text-xs text-emerald-300">Active</span>}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button onClick={handleCreateOverlay} disabled={loading || overlay !== null} className={btnPurple}>
            <div className="text-4xl mb-2">🌐</div>
            <h3 className="text-white font-bold mb-1">
              {overlay ? 'Overlay Active' : 'Create Overlay'}
            </h3>
            <p className="text-white/90 text-sm">Overlay.create() with SHIP/SLAP</p>
          </button>

          <button onClick={handleQueryLookup} disabled={loading || !overlay} className={btnPurple}>
            <div className="text-4xl mb-2">🔎</div>
            <h3 className="text-white font-bold mb-1">Query Lookup</h3>
            <p className="text-white/90 text-sm">
              {!overlay ? 'Create overlay first' : 'overlay.query(ls_ship)'}
            </p>
          </button>

          <button onClick={handleAdvertiseSHIP} disabled={loading || !wallet} className={btnPurple}>
            <div className="text-4xl mb-2">📡</div>
            <h3 className="text-white font-bold mb-1">Advertise SHIP</h3>
            <p className="text-white/90 text-sm">
              {!wallet ? 'Connect wallet first' : 'wallet.advertiseSHIP()'}
            </p>
          </button>

          <button onClick={handleAdvertiseSLAP} disabled={loading || !wallet} className={btnPurple}>
            <div className="text-4xl mb-2">📢</div>
            <h3 className="text-white font-bold mb-1">Advertise SLAP</h3>
            <p className="text-white/90 text-sm">
              {!wallet ? 'Connect wallet first' : 'wallet.advertiseSLAP()'}
            </p>
          </button>
        </div>

        {/* ================================================================ */}
        {/* DID & Verifiable Credentials */}
        {/* ================================================================ */}
        <h2 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">DID & Verifiable Credentials</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button onClick={handleGetDID} disabled={loading || !wallet} className={btnGreen}>
            <div className="text-4xl mb-2">🆔</div>
            <h3 className="text-white font-bold mb-1">Get DID</h3>
            <p className="text-white/90 text-sm">wallet.getDID() — W3C DID Document</p>
          </button>

          <button onClick={handleRegisterDID} disabled={loading || !wallet} className={btnGreen}>
            <div className="text-4xl mb-2">📄</div>
            <h3 className="text-white font-bold mb-1">Register DID</h3>
            <p className="text-white/90 text-sm">wallet.registerDID() — persist as certificate</p>
          </button>

          <button onClick={handleResolveDID} disabled={loading || !wallet} className={btnGreen}>
            <div className="text-4xl mb-2">🔍</div>
            <h3 className="text-white font-bold mb-1">Resolve DID</h3>
            <p className="text-white/90 text-sm">wallet.resolveDID() — resolve any did:bsv:</p>
          </button>

          <button onClick={handleIssueVC} disabled={loading || !wallet || !certifier} className={btnAmber}>
            <div className="text-4xl mb-2">🏅</div>
            <h3 className="text-white font-bold mb-1">Issue VC</h3>
            <p className="text-white/90 text-sm">
              {!certifier ? 'Launch certifier first' : 'toVerifiableCredential() — W3C VC'}
            </p>
          </button>

          <button onClick={handleListCredentials} disabled={loading || !wallet || !certifier} className={btnAmber}>
            <div className="text-4xl mb-2">📋</div>
            <h3 className="text-white font-bold mb-1">List Credentials</h3>
            <p className="text-white/90 text-sm">
              {!certifier ? 'Launch certifier first' : 'wallet.listCredentials() — as W3C VCs'}
            </p>
          </button>

          <button onClick={handleCreatePresentation} disabled={loading || !wallet || !certifier} className={btnAmber}>
            <div className="text-4xl mb-2">📑</div>
            <h3 className="text-white font-bold mb-1">Create Presentation</h3>
            <p className="text-white/90 text-sm">
              {!certifier ? 'Launch certifier first' : 'wallet.createPresentation() — W3C VP'}
            </p>
          </button>
        </div>

        {/* ================================================================ */}
        {/* Certification Actions */}
        {/* ================================================================ */}
        <h2 className="text-white/80 text-sm font-semibold uppercase tracking-wider mb-3">Certification</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <button onClick={handleLaunchCertifier} disabled={loading || certifier !== null} className={btnAmber}>
            <div className="text-4xl mb-2">🏛️</div>
            <h3 className="text-white font-bold mb-1">
              {certifier ? 'Certifier Active' : 'Launch Certifier'}
            </h3>
            <p className="text-white/90 text-sm">Certifier.create()</p>
          </button>

          <button onClick={handleGetCertified} disabled={loading || !wallet || !certifier || isCertified} className={btnGreen}>
            <div className="text-4xl mb-2">🛡️</div>
            <h3 className="text-white font-bold mb-1">
              {isCertified ? 'Certified' : 'Get Certified'}
            </h3>
            <p className="text-white/90 text-sm">
              {isCertified ? 'Certificate active' : 'certifier.certify(wallet)'}
            </p>
          </button>

          <button onClick={handleRevokeCertificate} disabled={loading || !wallet || !isCertified} className={btnRed}>
            <div className="text-4xl mb-2">🗑️</div>
            <h3 className="text-white font-bold mb-1">Revoke Certificate</h3>
            <p className="text-white/90 text-sm">wallet.relinquishCert()</p>
          </button>

          <button onClick={() => setResults([])} disabled={results.length === 0} className={btnPurple}>
            <div className="text-4xl mb-2">🧹</div>
            <h3 className="text-white font-bold mb-1">Clear Results</h3>
            <p className="text-white/90 text-sm">Reset test results</p>
          </button>
        </div>

        {/* ================================================================ */}
        {/* Results */}
        {/* ================================================================ */}
        <div className="bg-gradient-to-br from-purple-400/30 to-indigo-500/30 backdrop-blur-md rounded-lg p-6 border-2 border-purple-300/50 shadow-xl">
          <h2 className="text-white text-xl font-semibold mb-4">Test Results</h2>

          {results.length === 0 ? (
            <p className="text-white/80 text-center py-8">No results yet. Try running some tests!</p>
          ) : (
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 backdrop-blur-sm ${
                    result.success
                      ? 'bg-green-400/30 border-green-300/50'
                      : 'bg-red-400/30 border-red-300/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-sm">{result.timestamp}</span>
                      <span className="text-white/70">&bull;</span>
                      <span className="text-white font-semibold">{result.type}</span>
                      <span className="text-white/70">&bull;</span>
                      <span className="text-white/90">{result.action}</span>
                    </div>
                    <span className="text-2xl">{result.success ? '✅' : '❌'}</span>
                  </div>

                  {result.success && result.data && (
                    <div className="mt-2 p-3 bg-black/20 rounded font-mono text-xs text-white overflow-x-auto">
                      <pre>{JSON.stringify(result.data, null, 2)}</pre>
                    </div>
                  )}

                  {!result.success && result.error && (
                    <div className="mt-2 p-3 bg-red-900/30 rounded font-mono text-xs text-red-100">
                      {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-white text-sm">
          <p className="drop-shadow-lg">Built with @bsv/simplifier • Testing simplified BSV development</p>
        </div>
      </div>
    </div>
  )
}
