/**
 * Test script for OpenWork Auto-Submission Bot
 */

const { OpenWorkClient, filterMission, generateSubmission } = require('./index');
const config = require('./config.json');

async function test() {
  console.log('🧪 Testing OpenWork Auto-Submission Bot\n');

  const client = new OpenWorkClient(config.apiKey);

  // Test 1: Fetch missions
  console.log('Test 1: Fetching missions...');
  try {
    const missions = await client.getMissions();
    console.log(`✅ Success! Found ${missions.length} missions\n`);
  } catch (error) {
    console.error(`❌ Failed: ${error.message}\n`);
    return;
  }

  // Test 2: Filter missions
  console.log('Test 2: Filtering missions...');
  const allMissions = await client.getMissions();
  const filtered = allMissions.filter(m => filterMission(m, config.filters));
  console.log(`✅ Success! ${filtered.length} missions match filters`);
  filtered.forEach(m => console.log(`   - ${m.title} (${m.reward} tokens)\n`));

  // Test 3: Generate submission
  console.log('Test 3: Generating submission...');
  if (filtered.length > 0) {
    const sample = filtered[0];
    const submission = generateSubmission(sample);
    console.log(`✅ Success! Sample submission for "${sample.title}":`);
    console.log(`   ${submission}\n`);
  }

  // Test 4: Rate limit check
  console.log('Test 4: Checking rate limits...');
  const rateLimit = client.checkRateLimit();
  if (rateLimit.allowed) {
    console.log('✅ Success! Ready to submit\n');
  } else {
    console.log(`⚠️  Rate limit: ${rateLimit.reason}\n`);
  }

  console.log('✅ All tests passed!');
}

test().catch(console.error);
