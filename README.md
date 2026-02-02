# NexHealth API Demo

Simple CLI tool to test the NexHealth API against sandbox data.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/beehner/nexhealth-demo.git
cd nexhealth-demo

# Run commands (no npm install needed - uses native fetch)
node index.js help
node index.js patients
node index.js appointments
node index.js providers
```

## Commands

| Command | Description |
|---------|-------------|
| `auth` | Authenticate and show bearer token |
| `patients` | List patients |
| `appointments` | List appointments (next 30 days) |
| `providers` | List providers |
| `locations` | List locations |
| `slots` | Get available appointment slots |
| `create-patient` | Create a test patient |

## Configuration

Default config is baked in for the demo sandbox. Override with environment variables:

```bash
export NEXHEALTH_API_KEY="your-api-key"
export NEXHEALTH_SUBDOMAIN="your-subdomain"
export NEXHEALTH_LOCATION_ID="your-location-id"
```

## API Reference

Full NexHealth docs: https://docs.nexhealth.com/reference

## Notes

- This uses the **sandbox/test environment** - no real patient data
- Requires Node.js 18+ (uses native fetch)
