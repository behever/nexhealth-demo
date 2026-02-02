#!/usr/bin/env node

/**
 * NexHealth Billing Module
 * 
 * Note: Billing endpoints require a production connection to Dentrix.
 * Sandbox has limited billing data.
 * 
 * Usage:
 *   node billing.js balances           - List patient balances
 *   node billing.js charges            - List charges
 *   node billing.js payments           - List payments
 *   node billing.js patient <id>       - Show patient billing summary
 *   node billing.js create-charge <patient_id> <amount> <desc>
 *   node billing.js create-payment <patient_id> <amount>
 */

const CONFIG = {
  apiKey: process.env.NEXHEALTH_API_KEY || 'dXNlci0xMzU4LXNhbmRib3g.wSM7wWcSe-JL0V-Pg5EOKhKshn1ULwuq',
  subdomain: process.env.NEXHEALTH_SUBDOMAIN || 'gentle-family-dentistry-demo-practice',
  locationId: process.env.NEXHEALTH_LOCATION_ID || '340668',
  baseUrl: 'https://nexhealth.info',
  // Use newer API version for billing endpoints
  apiVersion: '20240412'
};

// ============ API Helper ============

async function apiCall(endpoint, options = {}) {
  const url = new URL(`${CONFIG.baseUrl}${endpoint}`);
  url.searchParams.set('subdomain', CONFIG.subdomain);
  url.searchParams.set('location_id', CONFIG.locationId);
  
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) {
        url.searchParams.set(k, v);
      }
    });
  }
  
  const res = await fetch(url.toString(), {
    method: options.method || 'GET',
    headers: {
      'Authorization': CONFIG.apiKey,
      'Accept': `application/vnd.Nexhealth+json;version=${options.version || CONFIG.apiVersion}`,
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  
  const data = await res.json();
  
  if (data.error && data.error.length > 0) {
    // Check if it's a version redirect message
    if (data.description && data.description.includes('no longer supported')) {
      console.log('Note:', data.description);
    }
    if (data.error[0] && data.error[0] !== 'N') {
      throw new Error(data.error[0]);
    }
  }
  
  return data;
}

// ============ Billing Commands ============

async function listCharges(patientId = null) {
  console.log('\n💳 Fetching charges...\n');
  
  const params = { page: 1, per_page: 20 };
  if (patientId) params.patient_id = patientId;
  
  try {
    const data = await apiCall('/charges', { params });
    
    const charges = data.data?.charges || data.data || [];
    
    if (charges.length === 0) {
      console.log('No charges found.');
      console.log('\n(Note: Sandbox environment has limited billing data)');
      return [];
    }
    
    console.log(`Found ${data.count || charges.length} charges:\n`);
    
    charges.forEach((c, i) => {
      console.log(`${i + 1}. Charge #${c.id}`);
      console.log(`   Patient ID: ${c.patient_id}`);
      console.log(`   Amount: $${(c.amount / 100).toFixed(2)}`);
      console.log(`   Description: ${c.description || 'N/A'}`);
      console.log(`   Date: ${c.date || c.created_at}`);
      console.log(`   Status: ${c.status || 'N/A'}`);
      console.log('');
    });
    
    return charges;
  } catch (err) {
    console.log('Could not fetch charges:', err.message);
    console.log('(Billing endpoints may require production Dentrix connection)');
    return [];
  }
}

async function listPayments(patientId = null) {
  console.log('\n💰 Fetching payments...\n');
  
  const params = { page: 1, per_page: 20 };
  if (patientId) params.patient_id = patientId;
  
  try {
    const data = await apiCall('/payments', { params });
    
    const payments = data.data?.payments || data.data || [];
    
    if (payments.length === 0) {
      console.log('No payments found.');
      console.log('\n(Note: Sandbox environment has limited billing data)');
      return [];
    }
    
    console.log(`Found ${data.count || payments.length} payments:\n`);
    
    payments.forEach((p, i) => {
      console.log(`${i + 1}. Payment #${p.id}`);
      console.log(`   Patient ID: ${p.patient_id}`);
      console.log(`   Amount: $${(p.amount / 100).toFixed(2)}`);
      console.log(`   Method: ${p.payment_method || 'N/A'}`);
      console.log(`   Date: ${p.date || p.created_at}`);
      console.log('');
    });
    
    return payments;
  } catch (err) {
    console.log('Could not fetch payments:', err.message);
    console.log('(Billing endpoints may require production Dentrix connection)');
    return [];
  }
}

async function listBalances() {
  console.log('\n📊 Fetching patient balances...\n');
  
  try {
    // First get patients
    const patientsData = await apiCall('/patients', { 
      params: { per_page: 10 },
      version: '2'  // Use old version for patients
    });
    
    const patients = patientsData.data?.patients || [];
    
    console.log('Patient Balances:\n');
    console.log('─'.repeat(60));
    console.log('ID'.padEnd(12) + 'Name'.padEnd(25) + 'Balance');
    console.log('─'.repeat(60));
    
    for (const p of patients.slice(0, 10)) {
      // Try to get balance for each patient
      try {
        const balanceData = await apiCall(`/patients/${p.id}/balance`, {
          params: {},
          version: CONFIG.apiVersion
        });
        const balance = balanceData.data?.balance || 0;
        console.log(
          String(p.id).padEnd(12) + 
          `${p.first_name} ${p.last_name}`.substring(0, 23).padEnd(25) + 
          `$${(balance / 100).toFixed(2)}`
        );
      } catch (e) {
        console.log(
          String(p.id).padEnd(12) + 
          `${p.first_name} ${p.last_name}`.substring(0, 23).padEnd(25) + 
          '(N/A)'
        );
      }
    }
    
    console.log('─'.repeat(60));
    console.log('\n(Note: Balance data requires production Dentrix connection)');
    
  } catch (err) {
    console.log('Could not fetch balances:', err.message);
  }
}

async function getPatientBilling(patientId) {
  console.log(`\n📋 Billing Summary for Patient ${patientId}\n`);
  console.log('═'.repeat(50));
  
  // Get patient info
  try {
    const patientData = await apiCall(`/patients/${patientId}`, { version: '2' });
    const p = patientData.data?.patient || patientData.data;
    console.log(`Patient: ${p.first_name} ${p.last_name}`);
    console.log(`Email: ${p.email || 'N/A'}`);
    console.log(`Phone: ${p.bio?.phone_number || 'N/A'}`);
  } catch (e) {
    console.log(`Patient ID: ${patientId}`);
  }
  
  console.log('═'.repeat(50));
  
  // Get charges
  console.log('\n--- Recent Charges ---');
  const charges = await listChargesForPatient(patientId);
  
  // Get payments
  console.log('\n--- Recent Payments ---');
  const payments = await listPaymentsForPatient(patientId);
  
  // Calculate summary
  const totalCharges = charges.reduce((sum, c) => sum + (c.amount || 0), 0);
  const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const balance = totalCharges - totalPayments;
  
  console.log('\n--- Summary ---');
  console.log(`Total Charges:  $${(totalCharges / 100).toFixed(2)}`);
  console.log(`Total Payments: $${(totalPayments / 100).toFixed(2)}`);
  console.log(`Balance Due:    $${(balance / 100).toFixed(2)}`);
}

async function listChargesForPatient(patientId) {
  try {
    const data = await apiCall('/charges', { 
      params: { patient_id: patientId, per_page: 5 }
    });
    const charges = data.data?.charges || data.data || [];
    
    if (charges.length === 0) {
      console.log('No charges found.');
      return [];
    }
    
    charges.forEach(c => {
      console.log(`  ${c.date || 'N/A'} - $${(c.amount / 100).toFixed(2)} - ${c.description || 'Charge'}`);
    });
    
    return charges;
  } catch (e) {
    console.log('  (No charge data available)');
    return [];
  }
}

async function listPaymentsForPatient(patientId) {
  try {
    const data = await apiCall('/payments', { 
      params: { patient_id: patientId, per_page: 5 }
    });
    const payments = data.data?.payments || data.data || [];
    
    if (payments.length === 0) {
      console.log('No payments found.');
      return [];
    }
    
    payments.forEach(p => {
      console.log(`  ${p.date || 'N/A'} - $${(p.amount / 100).toFixed(2)} - ${p.payment_method || 'Payment'}`);
    });
    
    return payments;
  } catch (e) {
    console.log('  (No payment data available)');
    return [];
  }
}

async function createCharge(patientId, amount, description) {
  console.log('\n➕ Creating charge...\n');
  
  const charge = {
    charge: {
      patient_id: parseInt(patientId),
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      description: description || 'Service charge',
      date: new Date().toISOString().split('T')[0]
    }
  };
  
  console.log('Charge details:');
  console.log(`  Patient: ${patientId}`);
  console.log(`  Amount: $${amount}`);
  console.log(`  Description: ${charge.charge.description}`);
  
  try {
    const data = await apiCall('/charges', {
      method: 'POST',
      body: charge
    });
    
    console.log('\n✓ Charge created successfully!');
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.log('\n❌ Could not create charge:', err.message);
    console.log('(Creating charges may require production Dentrix connection)');
  }
}

async function createPayment(patientId, amount, method = 'cash') {
  console.log('\n➕ Recording payment...\n');
  
  const payment = {
    payment: {
      patient_id: parseInt(patientId),
      amount: Math.round(parseFloat(amount) * 100), // Convert to cents
      payment_method: method,
      date: new Date().toISOString().split('T')[0]
    }
  };
  
  console.log('Payment details:');
  console.log(`  Patient: ${patientId}`);
  console.log(`  Amount: $${amount}`);
  console.log(`  Method: ${method}`);
  
  try {
    const data = await apiCall('/payments', {
      method: 'POST',
      body: payment
    });
    
    console.log('\n✓ Payment recorded successfully!');
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.log('\n❌ Could not record payment:', err.message);
    console.log('(Recording payments may require production Dentrix connection)');
  }
}

// ============ Main ============

async function main() {
  const command = process.argv[2] || 'help';
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];
  const arg3 = process.argv[5];
  
  console.log('═══════════════════════════════════════');
  console.log('     NexHealth Billing Module');
  console.log('═══════════════════════════════════════');
  console.log(`Subdomain: ${CONFIG.subdomain}`);
  console.log(`Location:  ${CONFIG.locationId}`);
  console.log('═══════════════════════════════════════');
  
  try {
    switch (command) {
      case 'charges':
        await listCharges(arg1); // Optional patient_id
        break;
        
      case 'payments':
        await listPayments(arg1); // Optional patient_id
        break;
        
      case 'balances':
        await listBalances();
        break;
        
      case 'patient':
        if (!arg1) {
          console.log('Usage: node billing.js patient <patient_id>');
          break;
        }
        await getPatientBilling(arg1);
        break;
        
      case 'create-charge':
        if (!arg1 || !arg2) {
          console.log('Usage: node billing.js create-charge <patient_id> <amount> [description]');
          break;
        }
        await createCharge(arg1, arg2, arg3);
        break;
        
      case 'create-payment':
        if (!arg1 || !arg2) {
          console.log('Usage: node billing.js create-payment <patient_id> <amount> [method]');
          break;
        }
        await createPayment(arg1, arg2, arg3);
        break;
        
      case 'help':
      default:
        console.log(`
Usage: node billing.js <command>

Commands:
  balances                    - List patient balances
  charges [patient_id]        - List charges (optionally for specific patient)
  payments [patient_id]       - List payments (optionally for specific patient)
  patient <patient_id>        - Full billing summary for a patient
  create-charge <patient_id> <amount> [description]
  create-payment <patient_id> <amount> [method]

Examples:
  node billing.js balances
  node billing.js patient 449388061
  node billing.js create-charge 449388061 150.00 "Cleaning"
  node billing.js create-payment 449388061 150.00 "credit_card"

Note: Billing functionality requires a production connection to Dentrix.
The sandbox environment has limited billing data.
`);
    }
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
