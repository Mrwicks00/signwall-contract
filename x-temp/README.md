# SignWall Driver Script

This script automatically calls the `sign` function on the SignWall contract at regular intervals.

## Prerequisites

1. Ensure you have your mnemonic set in `settings/Mainnet.toml`:
   ```toml
   [accounts.deployer]
   mnemonic = "your twelve or twenty-four word mnemonic here"
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

## Usage

### Default Mode (Sign Wall Every 10 Minutes)
```bash
npx tsx x-temp/signwall-driver.ts
```

This will:
- Call the `sign` function every 10 minutes
- Use random names from a predefined list
- Use random messages from a predefined list
- Continue running until you press Ctrl+C

### Fast Mode (For Testing)
```bash
npx tsx x-temp/signwall-driver.ts --fast
```

This uses shorter delays (10-40 seconds) for quick testing.

### Available Modes

#### Sign Mode (Default)
```bash
npx tsx x-temp/signwall-driver.ts --mode=sign
```
Continuously signs the wall with random names and messages.

#### Counter Mode
```bash
npx tsx x-temp/signwall-driver.ts --mode=counter
```
Tests the counter increment function.

#### Update Mode
```bash
npx tsx x-temp/signwall-driver.ts --mode=update
```
Updates existing signatures (requires you to have signed first).

### Combining Options
```bash
npx tsx x-temp/signwall-driver.ts --fast --mode=sign
```

## Features

- **Automatic retry**: Retries failed transactions up to 3 times
- **Random delays**: Uses configurable delay intervals
- **Status reporting**: Shows transaction IDs and current state
- **Graceful shutdown**: Press Ctrl+C to stop cleanly
- **Read-only checks**: Verifies state after each transaction

## Customization

You can customize the script by editing:
- `SAMPLE_NAMES`: Array of names to use when signing
- `SAMPLE_MESSAGES`: Array of messages to use when signing
- `DELAY_CHOICES_MS`: Delay intervals between calls
- `DEFAULT_FEE_USTX`: Transaction fee amount

## Notes

- The script reads your mnemonic from `settings/Mainnet.toml`
- It derives your private key automatically
- All transactions are broadcast to mainnet
- The default interval is 10 minutes (600,000ms)
- Use `--fast` for testing with shorter intervals (10-40 seconds)
