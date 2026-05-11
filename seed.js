#!/usr/bin/env node
'use strict';

/**
 * سكريبت التحديث (Seed) لمتجر DirtMC
 * يقوم هذا السكريبت بضبط البريد الإلكتروني وكلمة المرور في قاعدة البيانات
 */

const mongoose = require('mongoose');
// تأكد أن هذا المسار يشير إلى ملف المودلز في مشروعك
const { Settings } = require('./server/models');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dirtmc';

// البيانات التي حددتها أنت
const ADMIN_EMAIL = 'moradmorad461@gmail.com';
const ADMIN_PASS  = '531531morad';

async function main() {
  try {
    console.log('--- [DirtMC Auth Update] ---');
    await mongoose.connect(MONGO_URI);
    console.log('[db] Connected to MongoDB.');

    // تحديث أو إنشاء الإعدادات في قاعدة البيانات
    // نستخدم updateOne مع upsert لضمان وجود السجل وتحديثه
    await Settings.updateOne({}, { 
      adminEmail: ADMIN_EMAIL, 
      adminPassword: ADMIN_PASS 
    }, { upsert: true });

    console.log('---------------------------------');
    console.log('✅ Authentication Details Updated!');
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log(`🔑 Password: ${ADMIN_PASS}`);
    console.log('---------------------------------');
    console.log('[seed] You can now login using these credentials.');

  } catch (error) {
    console.error('[error] Failed to seed database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('[db] Disconnected. Done.');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
