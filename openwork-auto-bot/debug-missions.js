/**
 * Debug script to see available missions
 */

const axios = require('axios');

const config = JSON.parse(require('fs').readFileSync('./config-enhanced.json', 'utf8'));

async function debugMissions() {
  console.log('🔍 Fetching missions for debug...\n');

  const response = await axios.get('https://openwork.bot/api/missions', {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  const missions = response.data.missions || [];
  console.log(`📡 Retrieved ${missions.length} missions\n`);

  // Display all missions
  missions.forEach((mission, index) => {
    console.log(`\n${index + 1}. ${mission.title}`);
    console.log(`   ID: ${mission.id}`);
    console.log(`   Status: ${mission.status}`);
    console.log(`   Reward: ${mission.reward} tokens`);
    console.log(`   Tags: ${mission.tags ? mission.tags.join(', ') : 'none'}`);
    console.log(`   On-chain: ${mission.onchain_job_id ? 'yes' : 'no'}`);
    console.log(`   Requirements: ${mission.requirements ? mission.requirements.length : 0}`);

    if (mission.description) {
      const desc = mission.description.substring(0, 200);
      console.log(`   Description: ${desc}${mission.description.length > 200 ? '...' : ''}`);
    }
  });

  // Analyze why no missions are AI-friendly
  console.log('\n\n📊 Analysis:\n');

  const aiFriendly = [];
  const excluded = [];

  missions.forEach(mission => {
    // Check AI-friendly criteria
    const aiFriendlyTags = ['research', 'writing', 'analysis', 'documentation', 'content', 'social'];
    const description = mission.description?.toLowerCase() || '';
    const title = mission.title?.toLowerCase() || '';

    const hasAiTag = mission.tags?.some(tag => aiFriendlyTags.includes(tag));
    const hasAiKeyword =
      description.includes('write') ||
      description.includes('research') ||
      description.includes('analyze') ||
      description.includes('create content') ||
      description.includes('review') ||
      title.includes('write') ||
      title.includes('research') ||
      title.includes('analyze');

    // Check exclusion criteria
    const isExcluded =
      mission.status !== 'open' ||
      mission.onchain_job_id !== null ||
      (mission.requirements && mission.requirements.length > 0) ||
      config.filters.excludeTags.some(tag => mission.tags?.includes(tag));

    if (isExcluded) {
      excluded.push({
        id: mission.id,
        title: mission.title,
        reason: mission.status !== 'open' ? 'not open' :
               mission.onchain_job_id !== null ? 'on-chain' :
               mission.requirements?.length > 0 ? 'has requirements' :
               'excluded tag'
      });
    } else if (hasAiTag || hasAiKeyword) {
      aiFriendly.push({
        id: mission.id,
        title: mission.title,
        tags: mission.tags,
        hasAiTag,
        hasAiKeyword
      });
    }
  });

  console.log(`✅ AI-friendly missions: ${aiFriendly.length}`);
  aiFriendly.forEach(m => {
    console.log(`   - ${m.title} (tag: ${m.hasAiTag}, keyword: ${m.hasAiKeyword})`);
  });

  console.log(`\n❌ Excluded missions: ${excluded.length}`);
  excluded.forEach(m => {
    console.log(`   - ${m.title} (${m.reason})`);
  });
}

debugMissions().catch(console.error);
