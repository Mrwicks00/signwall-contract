# SignWall

A simple on-chain guestbook smart contract for Stacks blockchain built with Clarity. Leave your mark, share messages, and see who's been here.

## What It Does

SignWall allows you to:
- Sign the wall with your name and message
- View all signatures
- Count total signatures
- See who signed and when
- Update your signature
- Build a permanent record on-chain

Perfect for:
- Community engagement
- Event attendance tracking
- Learning Clarity basics
- Understanding lists and storage
- Building social proof
- Creating digital monuments

## Features

- **Permanent Signatures**: All messages stored forever on-chain
- **Public Wall**: Anyone can read all signatures
- **One Signature Per User**: Each address can sign once (or update)
- **Timestamp Tracking**: Records when you signed
- **Simple Interface**: Easy to use functions
- **Gas Efficient**: Minimal transaction costs

## Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) installed
- Basic understanding of Stacks blockchain
- A Stacks wallet for testnet deployment

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/signwall.git
cd signwall

# Check Clarinet installation
clarinet --version
```

## Project Structure

```
signwall/
├── contracts/
│   └── signwall.clar        # Main guestbook contract
├── tests/
│   └── signwall_test.ts     # Contract tests
├── Clarinet.toml            # Project configuration
└── README.md
```

## Usage

### Deploy Locally

```bash
# Start Clarinet console
clarinet console

# Sign the wall
(contract-call? .signwall sign "Alice" "Hello from the blockchain!")

# View all signatures
(contract-call? .signwall get-all-signatures)

# Get total signatures
(contract-call? .signwall get-signature-count)

# Check if you've signed
(contract-call? .signwall has-signed tx-sender)
```

### Contract Functions

**sign (name, message)**
```clarity
(contract-call? .signwall sign "Bob" "Web3 is amazing!")
```
Sign the wall with your name and message

**update-signature (name, message)**
```clarity
(contract-call? .signwall update-signature "Bob" "Updated my message!")
```
Update your existing signature

**get-signature (user)**
```clarity
(contract-call? .signwall get-signature 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
```
Get a specific user's signature

**get-all-signatures**
```clarity
(contract-call? .signwall get-all-signatures)
```
Returns list of all signatures

**get-signature-count**
```clarity
(contract-call? .signwall get-signature-count)
```
Returns total number of signatures

**has-signed (user)**
```clarity
(contract-call? .signwall has-signed tx-sender)
```
Check if a user has signed

**get-recent-signatures (count)**
```clarity
(contract-call? .signwall get-recent-signatures u10)
```
Get the most recent N signatures

## How It Works

### Signing the Wall
1. User calls `sign` with name and message
2. Contract checks if user already signed
3. If new, adds signature to list
4. Timestamp recorded automatically
5. Signature stored permanently

### Signature Structure
Each signature contains:
- **Signer**: Principal address
- **Name**: Display name (string)
- **Message**: Their message (string)
- **Block Height**: When they signed (uint)
- **Timestamp**: Block number

### Updating Signatures
1. User calls `update-signature`
2. Contract verifies they already signed
3. New message replaces old one
4. Original timestamp preserved

## Data Structure

### Signature Format
```clarity
{
  signer: principal,
  name: (string-ascii 50),
  message: (string-utf8 500),
  block-height: uint
}
```

### Storage Pattern
```clarity
;; List of all signatures
(define-data-var signatures (list 1000 signature) (list))

;; Map to track who signed
(define-map signers principal bool)

;; Counter for total signatures
(define-data-var signature-count uint u0)
```

## Testing

```bash
# Run all tests
npm run test

# Check contract syntax
clarinet check

# Run specific test
npm run test -- signwall
```

## Learning Goals

Building this contract teaches you:
- ✅ Working with lists in Clarity
- ✅ Storing and reading data structures
- ✅ Using maps for lookups
- ✅ Handling strings (ASCII and UTF-8)
- ✅ Block height and timestamps
- ✅ Preventing duplicate entries

## Example Use Cases

**Event Guestbook:**
```clarity
(contract-call? .signwall sign "Alice" "Great conference! Learned so much about Clarity")
(contract-call? .signwall sign "Bob" "Best blockchain event of 2024!")
(contract-call? .signwall sign "Charlie" "Can't wait for next year!")
```

**Project Launch:**
```clarity
(contract-call? .signwall sign "Founder" "Officially launching our dApp today!")
(contract-call? .signwall sign "Early Supporter" "Congrats on the launch!")
(contract-call? .signwall sign "Community Member" "This is going to be huge!")
```

**Digital Monument:**
```clarity
(contract-call? .signwall sign "Traveler" "Visited from Lagos, Nigeria 🇳🇬")
(contract-call? .signwall sign "Developer" "Built my first smart contract!")
(contract-call? .signwall sign "Collector" "Signature #100!")
```

**Team Building:**
```clarity
(contract-call? .signwall sign "Team Lead" "Welcome to the team!")
(contract-call? .signwall sign "New Hire" "Excited to be here!")
(contract-call? .signwall sign "Veteran" "Happy to work with you all!")
```

## Common Patterns

### First Time Signing
```clarity
;; Check if you've signed
(contract-call? .signwall has-signed tx-sender)

;; If not, sign
(contract-call? .signwall sign "YourName" "Your message here")
```

### Updating Your Message
```clarity
;; Update existing signature
(contract-call? .signwall update-signature "YourName" "New improved message!")
```

### Viewing Recent Activity
```clarity
;; Get last 5 signatures
(contract-call? .signwall get-recent-signatures u5)

;; Get total count
(contract-call? .signwall get-signature-count)
```

### Finding Specific User
```clarity
;; Look up someone's signature
(contract-call? .signwall get-signature 'ST1USER_ADDRESS)
```

## Signature Ideas

**Inspirational:**
- "Be the change you want to see"
- "Dream big, build bigger"
- "Innovation starts here"

**Fun:**
- "I was here! 🚀"
- "Blockchain tourist passing through"
- "Signed with ❤️ from [Your City]"

**Thoughtful:**
- "Leaving my mark on history"
- "First signature of many to come"
- "Proud to be part of this community"

**Creative:**
- "Building the future, one block at a time"
- "Decentralized and loving it"
- "Smart contracts, smarter future"

## Deployment

### Testnet
```bash
clarinet deployments generate --testnet --low-cost
clarinet deployments apply -p deployments/default.testnet-plan.yaml
```

### Mainnet
```bash
clarinet deployments generate --mainnet
clarinet deployments apply -p deployments/default.mainnet-plan.yaml
```

## Roadmap

- [ ] Write the core contract
- [ ] Add comprehensive tests
- [ ] Deploy to testnet
- [ ] Add signature reactions (likes/hearts)
- [ ] Support image/NFT attachments
- [ ] Add signature verification badges
- [ ] Implement signature threads/replies
- [ ] Create signature categories
- [ ] Add search functionality

## Limitations

⚠️ **Current Constraints:**
- Maximum 1000 signatures (can be increased)
- Names limited to 50 characters
- Messages limited to 500 characters
- One signature per address
- Cannot delete signatures (permanent)

💡 **Design Choices:**
- Permanent storage ensures historical record
- One per address prevents spam
- Public reading encourages transparency
- Simple structure keeps gas costs low

## Advanced Features (Future)

**Signature Reactions:**
- Like/heart signatures
- Track popularity
- Most liked wall

**Categories:**
- Tag signatures by topic
- Filter by category
- Themed walls

**Replies:**
- Reply to signatures
- Create conversations
- Thread view

**Verification:**
- Verified user badges
- Special signatures
- Trust levels

**Search:**
- Search by name
- Search by message
- Filter by date

## Security Features

- ✅ One signature per address (prevents spam)
- ✅ All data public (transparency)
- ✅ Permanent storage (can't be erased)
- ✅ No admin privileges
- ✅ Simple, auditable code
- ✅ No fund handling (no financial risk)

## Best Practices

**Writing Good Signatures:**
- Keep messages positive and respectful
- Be authentic and genuine
- Check for typos before signing
- Make it meaningful

**Using the Wall:**
- Read others' signatures for inspiration
- Update your signature as you grow
- Share the wall with friends
- Build community connections

**Gas Optimization:**
- Keep messages concise to save gas
- Sign once, update if needed
- Read data off-chain when possible

## Community Guidelines

💚 **Do:**
- Be kind and respectful
- Share positive messages
- Celebrate milestones
- Build connections

❌ **Don't:**
- Spam or abuse the wall
- Share offensive content
- Impersonate others
- Post sensitive information

## Contributing

This is a learning project! Feel free to:
- Open issues for questions
- Submit PRs for improvements
- Fork and experiment
- Share your signatures

## License

MIT License - do whatever you want with it

## Resources

- [Clarity Language Reference](https://docs.stacks.co/clarity)
- [Clarinet Documentation](https://github.com/hirosystems/clarinet)
- [Stacks Blockchain](https://www.stacks.co/)
- [Clarity Lists Guide](https://book.clarity-lang.org/)

---

Built while learning Clarity ✍️

## Fun Stats Ideas

Track interesting metrics:
- Longest message
- Shortest message
- First signer
- 100th signer milestone
- Most common words
- Signatures per day

## Inspiration

"A signature is not just a name - it's a moment captured in time, a connection made, a mark left on history."

Leave your mark. Sign the wall. 🖊️

---

**Remember:** Every signature tells a story. What's yours?
