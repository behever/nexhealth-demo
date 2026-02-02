#!/usr/bin/env node

/**
 * NexHealth Billing Dashboard Server
 * 
 * Run: node server.js
 * Open: http://localhost:3456
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  apiKey: process.env.NEXHEALTH_API_KEY || 'dXNlci0xMzU4LXNhbmRib3g.wSM7wWcSe-JL0V-Pg5EOKhKshn1ULwuq',
  subdomain: process.env.NEXHEALTH_SUBDOMAIN || 'gentle-family-dentistry-demo-practice',
  locationId: process.env.NEXHEALTH_LOCATION_ID || '340668',
  baseUrl: 'https://nexhealth.info'
};

const PORT = process.env.PORT || 3456;

// ============ NexHealth API Helper ============

async function nexhealthAPI(endpoint, params = {}) {
  const url = new URL(`${CONFIG.baseUrl}${endpoint}`);
  url.searchParams.set('subdomain', CONFIG.subdomain);
  url.searchParams.set('location_id', CONFIG.locationId);
  
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) {
      url.searchParams.set(k, v);
    }
  });
  
  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': CONFIG.apiKey,
      'Accept': 'application/vnd.Nexhealth+json;version=2'
    }
  });
  
  return res.json();
}

// ============ API Handlers ============

async function getPatients(req) {
  const url = new URL(req.url, `http://localhost`);
  const page = url.searchParams.get('page') || 1;
  const perPage = url.searchParams.get('per_page') || 20;
  const search = url.searchParams.get('search') || '';
  
  const params = { page, per_page: perPage };
  if (search) params.name = search;
  
  const data = await nexhealthAPI('/patients', params);
  return data;
}

async function getPatientDetails(patientId) {
  const [patient, procedures, charges, payments] = await Promise.all([
    nexhealthAPI(`/patients/${patientId}`),
    nexhealthAPI('/procedures', { patient_id: patientId, per_page: 50 }),
    nexhealthAPI('/charges', { patient_id: patientId, per_page: 50 }),
    nexhealthAPI('/payments', { patient_id: patientId, per_page: 50 })
  ]);
  
  return {
    patient: patient.data,
    procedures: procedures.data || [],
    charges: charges.data || [],
    payments: payments.data || [],
    procedureCount: procedures.count || 0,
    chargeCount: charges.count || 0,
    paymentCount: payments.count || 0
  };
}

async function getAllProcedures() {
  const data = await nexhealthAPI('/procedures', { 
    per_page: 100,
    updated_after: '2020-01-01'
  });
  return data;
}

// ============ HTTP Server ============

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  try {
    // API Routes
    if (url.pathname === '/api/patients') {
      const data = await getPatients(req);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }
    
    if (url.pathname.startsWith('/api/patients/') && url.pathname.split('/').length === 4) {
      const patientId = url.pathname.split('/')[3];
      const data = await getPatientDetails(patientId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }
    
    if (url.pathname === '/api/procedures') {
      const data = await getAllProcedures();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
      return;
    }
    
    // Serve index.html for root
    if (url.pathname === '/' || url.pathname === '/index.html') {
      const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
      return;
    }
    
    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    
  } catch (err) {
    console.error('Error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
});

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║       NexHealth Billing Dashboard                ║
╠══════════════════════════════════════════════════╣
║  Server running at: http://localhost:${PORT}        ║
║  Subdomain: ${CONFIG.subdomain.substring(0, 30).padEnd(30)}  ║
║  Location:  ${CONFIG.locationId.padEnd(30)}  ║
╚══════════════════════════════════════════════════╝
  `);
});
