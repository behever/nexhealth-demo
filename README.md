# NexHealth API Demo

Simple CLI tools to test the NexHealth API against sandbox data.

## Quick Start

```bash
# Clone the repo
git clone https://github.com/beehner/nexhealth-demo.git
cd nexhealth-demo

# Run commands (no npm install needed - uses native fetch)
node index.js help
node index.js patients
node billing.js help
```

## Main Tool (index.js)

| Command | Description |
|---------|-------------|
| `patients` | List patients |
| `patient <id>` | Show single patient |
| `appointments` | List appointments (next 30 days) |
| `providers` | List providers |
| `locations` | List locations |
| `slots` | Get available appointment slots |
| `create-patient` | Create a test patient |

## Billing Tool (billing.js)

| Command | Description |
|---------|-------------|
| `balances` | List patient balances |
| `charges [patient_id]` | List charges |
| `payments [patient_id]` | List payments |
| `patient <id>` | Full billing summary for a patient |
| `create-charge <patient_id> <amount> [desc]` | Create a charge |
| `create-payment <patient_id> <amount> [method]` | Record a payment |

### Billing Examples

```bash
node billing.js patient 449388061
node billing.js create-charge 449388061 150.00 "Cleaning"
node billing.js create-payment 449388061 150.00 "credit_card"
```

**Note:** Billing endpoints require a production Dentrix connection. Sandbox has limited billing data.

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
- Billing endpoints need production Dentrix to see real data
- Requires Node.js 18+ (uses native fetch)
