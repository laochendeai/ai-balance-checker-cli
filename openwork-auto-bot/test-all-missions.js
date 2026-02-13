#!/usr/bin/env node
/**
 * Test script to analyze all available OpenWork missions
 */

const axios = require('axios');

async function analyzeMissions() {
  try {
    console.log('📡 Fetching all missions...\n');

    const config = JSON.parse(require('fs').readFileSync('./config.json', 'utf8'));

    const response = await axios.get('https://openwork.bot/api/missions', {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      },
      params: {
        status: 'open',
        limit: 50
      }
    });

    const missions = response.data.missions || [];

    console.log(`✅ Retrieved ${missions.length} missions\n`);

    // Categorize missions
    const categories = {
      'Development (Code/PR)': [],
      'Research/Writing/Content': [],
      'Blockchain/Crypto': [],
      'Documentation': [],
      'Other': []
    };

    missions.forEach(mission => {
      const tags = mission.tags || [];
      const desc = (mission.description || '').toLowerCase();
      const title = (mission.title || '').toLowerCase();

      // Categorize
      if (desc.includes('pr') || desc.includes('github') || tags.includes('deployment')) {
        categories['Development (Code/PR)'].push(mission);
      } else if (tags.includes('research') || tags.includes('writing') || desc.includes('write') || desc.includes('article') || desc.includes('introduction')) {
        categories['Research/Writing/Content'].push(mission);
      } else if (tags.includes('delx') || tags.includes('donation') || tags.includes('usdc') || desc.includes('transaction') || desc.includes('blockchain')) {
        categories['Blockchain/Crypto'].push(mission);
      } else if (desc.includes('documentation') || desc.includes('docs')) {
        categories['Documentation'].push(mission);
      } else {
        categories['Other'].push(mission);
      }
    });

    // Print categories
    for (const [category, missions] of Object.entries(categories)) {
      if (missions.length > 0) {
        console.log(`\n📂 ${category} (${missions.length}):`);
        missions.slice(0, 5).forEach(m => {
          const status = m.submission ? '✓' : '○';
          console.log(`   ${status} [${m.id.substring(0, 8)}] ${m.title.substring(0, 60)}...`);
        });
        if (missions.length > 5) {
          console.log(`   ... and ${missions.length - 5} more`);
        }
      }
    }

    // Find best missions for AI generation
    console.log('\n🎯 Best Missions for AI Content Generation:\n');

    const bestMissions = missions
      .filter(m => !m.submission)  // Not submitted yet
      .filter(m => {
        const desc = (m.description || '').toLowerCase();
        const tags = m.tags || [];
        return tags.includes('research') ||
               tags.includes('writing') ||
               tags.includes('documentation') ||
               desc.includes('write') ||
               desc.includes('analyze') ||
               desc.includes('introduction') ||
               desc.includes('summary');
      })
      .slice(0, 10);

    if (bestMissions.length === 0) {
      console.log('   ⚠️ No AI-friendly missions available');
    } else {
      bestMissions.forEach(m => {
        console.log(`   📝 [${m.id}] ${m.title}`);
        console.log(`      Reward: ${m.reward || 0} tokens`);
        console.log(`      Tags: ${m.tags?.join(', ') || 'none'}`);
        console.log();
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

analyzeMissions();
