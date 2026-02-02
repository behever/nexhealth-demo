#!/usr/bin/env node

/**
 * NexHealth API Demo
 * 
 * Usage:
 *   node index.js patients      - List patients
 *   node index.js appointments  - List appointments
 *   node index.js providers     - List providers
 *   node index.js locations     - List locations
 *   node index.js create-patient - Create a test patient
 *   node index.js slots         - Get available appointment slots
 */

const CONFIG = {
  apiKey: process.env.NEXHEALTH_API_KEY || 'dXNlci0xMzU4LXNhbmRib3g.wSM7wWcSe-JL0V-Pg5EOKhKshn1ULwuq',
  subdomain: process.env.NEXHEALTH_SUBDOMAIN || 'gentle-family-dentistry-demo-practice',
  locationId: process.env.NEXHEALTH_LOCATION_ID || '340668',
  baseUrl: 'https://nexhealth.info'
};

// ============ API Helper ============

async function apiCall(endpoint, options = {}) {
  const url = new URL(`${CONFIG.baseUrl}${endpoint}`);
  url.searchParams.set('subdomain', CONFIG.subdomain);
  
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
      'Authorization': CONFIG.apiKey,  // API key goes directly here, no "Bearer" prefix
      'Accept': 'application/vnd.Nexhealth+json;version=2',
      'Content-Type': 'application/json',
      ...options.headers
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  
  const data = await res.json();
  
  if (data.error && data.error.length > 0) {
    console.error('API Error:', data.error);
    throw new Error(data.error[0]);
  }
  
  return data;
}

// ============ Commands ============

async function listPatients() {
  console.log('\n📋 Fetching patients...\n');
  
  const data = await apiCall('/patients', {
    params: {
      location_id: CONFIG.locationId,
      page: 1,
      per_page: 10
    }
  });
  
  const patients = data.data?.patients || [];
  
  if (patients.length === 0) {
    console.log('No patients found.');
    return;
  }
  
  console.log(`Found ${data.count || patients.length} patients:\n`);
  
  patients.forEach((p, i) => {
    console.log(`${i + 1}. ${p.first_name} ${p.last_name}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   Email: ${p.email || 'N/A'}`);
    console.log(`   Phone: ${p.bio?.phone_number || 'N/A'}`);
    console.log(`   DOB: ${p.bio?.date_of_birth || 'N/A'}`);
    console.log('');
  });
}

async function listAppointments() {
  console.log('\n📅 Fetching appointments...\n');
  
  const startDate = new Date().toISOString().split('T')[0];
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const data = await apiCall('/appointments', {
    params: {
      location_id: CONFIG.locationId,
      start_date: startDate,
      end_date: endDate,
      page: 1,
      per_page: 10
    }
  });
  
  const appointments = data.data?.appointments || [];
  
  if (appointments.length === 0) {
    console.log('No appointments found in the next 30 days.');
    return;
  }
  
  console.log(`Found ${data.count || appointments.length} appointments:\n`);
  
  appointments.forEach((a, i) => {
    console.log(`${i + 1}. Appointment #${a.id}`);
    console.log(`   Patient ID: ${a.patient_id}`);
    console.log(`   Provider ID: ${a.provider_id}`);
    console.log(`   Start: ${a.start_time}`);
    console.log(`   End: ${a.end_time}`);
    console.log(`   Confirmed: ${a.confirmed ? 'Yes' : 'No'}`);
    console.log('');
  });
}

async function listProviders() {
  console.log('\n👨‍⚕️ Fetching providers...\n');
  
  const data = await apiCall('/providers', {
    params: {
      location_id: CONFIG.locationId,
      page: 1,
      per_page: 20
    }
  });
  
  const providers = data.data?.providers || [];
  
  if (providers.length === 0) {
    console.log('No providers found.');
    return;
  }
  
  console.log(`Found ${data.count || providers.length} providers:\n`);
  
  providers.forEach((p, i) => {
    console.log(`${i + 1}. ${p.name || p.first_name + ' ' + p.last_name}`);
    console.log(`   ID: ${p.id}`);
    console.log(`   Type: ${p.provider_type || 'N/A'}`);
    console.log(`   Active: ${p.inactive ? 'No' : 'Yes'}`);
    console.log('');
  });
}

async function listLocations() {
  console.log('\n🏥 Fetching locations...\n');
  
  const data = await apiCall('/locations', {
    params: {}
  });
  
  const locations = data.data?.locations || [];
  
  if (locations.length === 0) {
    console.log('No locations found.');
    return;
  }
  
  console.log(`Found ${data.count || locations.length} locations:\n`);
  
  locations.forEach((l, i) => {
    console.log(`${i + 1}. ${l.name}`);
    console.log(`   ID: ${l.id}`);
    console.log(`   Address: ${l.address_line_1 || 'N/A'}, ${l.city || ''} ${l.state || ''} ${l.zip_code || ''}`);
    console.log(`   Phone: ${l.phone_number || 'N/A'}`);
    console.log('');
  });
}

async function createTestPatient() {
  console.log('\n➕ Creating test patient...\n');
  
  const timestamp = Date.now();
  const testPatient = {
    patient: {
      first_name: 'Test',
      last_name: `Patient${timestamp}`,
      email: `test${timestamp}@example.com`,
      bio: {
        phone_number: '5551234567',
        date_of_birth: '1990-01-15'
      }
    }
  };
  
  console.log('Creating patient:', testPatient.patient.first_name, testPatient.patient.last_name);
  
  const data = await apiCall('/patients', {
    method: 'POST',
    params: { location_id: CONFIG.locationId },
    body: testPatient
  });
  
  const patient = data.data?.patient || data.data;
  console.log('\n✓ Patient created successfully!');
  console.log(`  ID: ${patient.id}`);
  console.log(`  Name: ${patient.first_name} ${patient.last_name}`);
  console.log(`  Email: ${patient.email}`);
}

async function getAppointmentSlots() {
  console.log('\n🕐 Fetching available appointment slots...\n');
  
  // First get a provider
  const providersData = await apiCall('/providers', { 
    params: { 
      location_id: CONFIG.locationId,
      per_page: 1 
    } 
  });
  const providers = providersData.data?.providers || [];
  
  if (providers.length === 0) {
    console.log('No providers found - cannot fetch slots.');
    return;
  }
  
  const provider = providers[0];
  console.log(`Using provider: ${provider.name || provider.first_name} (ID: ${provider.id})`);
  
  const startDate = new Date().toISOString().split('T')[0];
  
  const data = await apiCall('/appointment_slots', {
    params: {
      start_date: startDate,
      days: 7,
      'lids[]': CONFIG.locationId,
      'pids[]': provider.id
    }
  });
  
  const slots = data.data || [];
  
  if (slots.length === 0) {
    console.log('\nNo available slots found for the next 7 days.');
    return;
  }
  
  console.log('\nAvailable slots:');
  slots.forEach(slot => {
    if (slot.slots && slot.slots.length > 0) {
      console.log(`\nLocation ${slot.lid}, Provider ${slot.pid}:`);
      slot.slots.slice(0, 5).forEach(s => {
        console.log(`  - ${s.time}`);
      });
      if (slot.slots.length > 5) {
        console.log(`  ... and ${slot.slots.length - 5} more`);
      }
    }
  });
}

async function showPatient(patientId) {
  console.log(`\n👤 Fetching patient ${patientId}...\n`);
  
  const data = await apiCall(`/patients/${patientId}`, {
    params: { location_id: CONFIG.locationId }
  });
  
  const p = data.data?.patient || data.data;
  
  console.log(`Name: ${p.first_name} ${p.last_name}`);
  console.log(`ID: ${p.id}`);
  console.log(`Email: ${p.email || 'N/A'}`);
  console.log(`Phone: ${p.bio?.phone_number || 'N/A'}`);
  console.log(`DOB: ${p.bio?.date_of_birth || 'N/A'}`);
  console.log(`Created: ${p.created_at}`);
}

// ============ Main ============

async function main() {
  const command = process.argv[2] || 'help';
  const arg = process.argv[3];
  
  console.log('═══════════════════════════════════════');
  console.log('       NexHealth API Demo Tool');
  console.log('═══════════════════════════════════════');
  console.log(`Subdomain: ${CONFIG.subdomain}`);
  console.log(`Location:  ${CONFIG.locationId}`);
  console.log('═══════════════════════════════════════');
  
  try {
    switch (command) {
      case 'patients':
        await listPatients();
        break;
        
      case 'patient':
        if (!arg) {
          console.log('Usage: node index.js patient <patient_id>');
          break;
        }
        await showPatient(arg);
        break;
        
      case 'appointments':
        await listAppointments();
        break;
        
      case 'providers':
        await listProviders();
        break;
        
      case 'locations':
        await listLocations();
        break;
        
      case 'create-patient':
        await createTestPatient();
        break;
        
      case 'slots':
        await getAppointmentSlots();
        break;
        
      case 'help':
      default:
        console.log(`
Usage: node index.js <command>

Commands:
  patients          - List patients
  patient <id>      - Show single patient
  appointments      - List appointments (next 30 days)
  providers         - List providers
  locations         - List locations
  slots             - Get available appointment slots
  create-patient    - Create a test patient

Environment variables (optional):
  NEXHEALTH_API_KEY      - Override API key
  NEXHEALTH_SUBDOMAIN    - Override subdomain
  NEXHEALTH_LOCATION_ID  - Override location ID
`);
    }
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  }
}

main();
