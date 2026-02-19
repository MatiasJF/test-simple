# BSV Simple - Test Application

This Next.js application demonstrates the **@bsv/simple** library in action.

## What This Tests

The test page (`app/page.tsx`) provides interactive buttons to test all major features of the simple library:

### 1. **Wallet Connection** 🔗
- Tests: `createWallet()` and `wallet.getStatus()`
- Initializes wallet connection
- Retrieves identity key

### 2. **Simple Payment** 💸
- Tests: `wallet.pay({ to, satoshis, memo })`
- Creates a simple payment transaction
- Includes OP_RETURN memo
- Demonstrates simplified API vs raw SDK

### 3. **Token Creation** 🪙
- Tests: `wallet.createToken({ to, data, basket })`
- Creates encrypted PushDrop tokens
- Organizes tokens in baskets
- Encrypts token metadata

### 4. **Text Inscription** 📝
- Tests: `wallet.inscribeText(text)`
- Creates OP_RETURN inscriptions
- Stores text on-chain
- Tracks inscription metadata

### 5. **Overlay Creation** 🌐
- Tests: `Overlay.create()`, `overlay.addTopic()`, `overlay.getInfo()`
- Creates overlay network structures
- Manages topics
- Demonstrates overlay pattern

## Running the Test App

```bash
# Start the development server
npm run dev

# Open http://localhost:3000
```

## Features of the Test Page

### Interactive UI
- Beautiful gradient purple/indigo background
- Glass-morphism design with backdrop blur
- Responsive grid layout (1-2-3 columns)
- Disabled states when not applicable

### Real-time Status
- Status bar shows current operation
- Loading states during operations
- Success/error indicators

### Results Display
- Last 10 test results shown
- Color-coded success (green) / error (red)
- Timestamp for each operation
- Expandable JSON data view
- Full error messages

### Test Results Include:
- Operation type (wallet, payment, token, etc.)
- Action performed
- Success/failure status
- Returned data (TXID, basket, etc.)
- Error messages when applicable

## Library Features Demonstrated

### Simplified APIs

**Before (Raw SDK)**:
```typescript
// 15+ lines of code
const client = new WalletClient()
const lockingScript = new P2PKH().lock(address).toHex()
const memoScript = new Script()
  .writeOpCode(OP.OP_FALSE)
  .writeOpCode(OP.OP_RETURN)
  .writeBin(Array.from(Utils.toArray('memo', 'utf8')))
const result = await client.createAction({...})
```

**After (Simple)**:
```typescript
// 3 lines of code
const wallet = await createWallet()
const result = await wallet.pay({
  to: recipientKey, satoshis: 1000, memo: 'Thanks!'
})
```

## UI Components

### Action Buttons
- Wallet connection button
- Payment creation button
- Token creation button
- Inscription button
- Overlay creation button
- Clear results button

### Results Section
- Scrollable results list
- JSON pretty-print
- Timestamp display
- Success/error indicators

## Code Structure

```
app/page.tsx
├── State Management
│   ├── wallet (connected wallet instance)
│   ├── status (current operation status)
│   ├── results (test results array)
│   └── loading (loading state)
│
├── Event Handlers
│   ├── handleConnectWallet()
│   ├── handleSimplePayment()
│   ├── handleCreateToken()
│   ├── handleCreateInscription()
│   └── handleCreateOverlay()
│
└── UI Components
    ├── Status Bar
    ├── Action Buttons Grid
    ├── Results Display
    └── Footer
```

## Testing Workflow

1. **Connect Wallet** - Initialize the simple library
2. **Run Operations** - Test payments, tokens, inscriptions
3. **View Results** - See success/failure with full data
4. **Clear & Repeat** - Reset and test again

## Error Handling

All operations include comprehensive error handling:
- Try-catch blocks
- User-friendly error messages
- Error state in results
- Loading state management

## Next Steps

After testing the basic functionality:

1. **Add More Tests**:
   - Multi-output transactions
   - JSON inscriptions
   - File hash inscriptions
   - MessageBox integration

2. **Extend Functionality**:
   - Add wallet info display
   - Show transaction history
   - Display token lists
   - Query overlay data

3. **Production Features**:
   - Connect to real BSV wallet
   - Broadcast to mainnet/testnet
   - Store test results
   - Export test reports

## Requirements

- Next.js 15+
- React 19+
- @bsv/simple (local package)
- Tailwind CSS

## Notes

- This is a **demonstration/testing page**
- Transactions are attempted but may fail without proper wallet setup
- The overlay feature is functional for local testing
- Payment/token creation requires a connected BSV wallet

---

**Built with @bsv/simple**
Simplifying BSV blockchain development
