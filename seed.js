#!/usr/bin/env node
'use strict';

/**
 * Seed script — sets the initial shared PIN in MongoDB.
 * Run ONCE after first install:
 * node seed.js
 *
 * Or set a custom PIN:
 * SHARED_PIN=mySecret node seed.js
 */

const mongoose = require('mongoose');
// تأكد من أن المسار هنا صحيح بالنسبة لمشروعك (./server/models)
const { Settings } = require('./server/models');

const MONGO_URI  = process.env.MONGO_URI  || 'mongodb://127.0.0.1:27017/dirtmc';
// [تم التحديث] تم تغيير الرمز الافتراضي ليكون 6 أرقام ليتوافق مع الواجهة
const SHARED_PIN = process.env.SHARED_PIN || '563489';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('[db] Connected to Database');

  await Settings.setPin(SHARED_PIN);
  console.log(`[seed] Shared PIN set to: "${SHARED_PIN}"`);
  console.log('[seed] You can change it later via the owner menu (Change PIN) after logging in.');

  await mongoose.disconnect();
  console.log('[done]');
}

main().catch(e => { console.error(e); process.exit(1); });
