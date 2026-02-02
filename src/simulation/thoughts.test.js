/**
 * Test file for Thought & Memory System
 * Run: node src/simulation/thoughts.test.js
 */

import { createSimulation, THOUGHT_TYPE } from './index.js';

async function runTests() {
  console.log('🧪 Testing Thought & Memory System\n');
  
  const engine = createSimulation();
  const villagers = engine.getAllVillagers();
  
  // Test 1: Thought generation for each villager
  console.log('Test 1: Personality-driven thought generation');
  console.log('─'.repeat(60));
  for (const v of villagers) {
    const thought = engine.generateThought(v.id);
    if (thought) {
      const traits = v.traits.join(', ');
      console.log(`${v.name}`);
      console.log(`  Traits: ${traits}`);
      console.log(`  Thought (${thought.thought_type}): "${thought.content}"`);
      console.log();
    }
  }
  
  // Test 2: Memory system
  console.log('\nTest 2: Memory system');
  console.log('─'.repeat(60));
  
  // Record some interactions
  const interactions = [
    { v1: 'elara', v2: 'gideon', type: 'conversation', sentiment: 0.5 },
    { v1: 'brom', v2: 'ivy', type: 'greeting', sentiment: 0.3 },
    { v1: 'maeve', v2: 'finn', type: 'trade', sentiment: 0.4 },
    { v1: 'rose', v2: 'elara', type: 'help', sentiment: 0.6 },
  ];
  
  for (const { v1, v2, type, sentiment } of interactions) {
    const villager1 = engine.getVillager(v1);
    const villager2 = engine.getVillager(v2);
    
    const record = {
      villager1_id: v1,
      villager1_name: villager1.name,
      villager2_id: v2,
      villager2_name: villager2.name,
      type,
      sentiment,
      content: `A ${type} between ${villager1.name.split(' ')[0]} and ${villager2.name.split(' ')[0]}`
    };
    
    engine.memorySystem.recordInteraction(v1, record);
    engine.memorySystem.recordInteraction(v2, record);
    
    console.log(`Recorded: ${villager1.name.split(' ')[0]} ${type} ${villager2.name.split(' ')[0]} (sentiment: ${sentiment})`);
  }
  
  // Check memories
  console.log('\nMemory check:');
  const elaraMem = engine.getVillagerMemoryOf('elara', 'gideon');
  const elaraRoseMem = engine.getVillagerMemoryOf('elara', 'rose');
  console.log(`  Elara's impression of Gideon: ${elaraMem.impression?.relationshipTrend}`);
  console.log(`  Elara's impression of Rose: ${elaraRoseMem.impression?.relationshipTrend}`);
  
  // Test 3: Interaction thoughts
  console.log('\nTest 3: Thoughts about interactions');
  console.log('─'.repeat(60));
  
  for (const { v1, v2, type, sentiment } of interactions) {
    const villager = engine.getVillager(v1);
    const other = engine.getVillager(v2);
    
    const thought = engine.thoughtSystem.generateInteractionThought(villager, {
      villager1_id: v1,
      villager1_name: villager.name,
      villager2_id: v2,
      villager2_name: other.name,
      type,
      sentiment
    });
    
    console.log(`${villager.name.split(' ')[0]} thinks: "${thought.content}"`);
  }
  
  // Test 4: Inner monologue
  console.log('\nTest 4: Inner monologue');
  console.log('─'.repeat(60));
  
  // Modify some villager states to see varied monologues
  const finn = engine.getVillager('finn');
  finn.hunger = 80;
  finn.energy = 25;
  finn.activity = 'wandering';
  
  const finnMono = engine.getVillagerInnerMonologue('finn');
  console.log(`Finn (hungry, tired, wandering):`);
  finnMono.thoughts.forEach(t => console.log(`  - ${t}`));
  
  console.log('\n✅ All tests completed!');
}

runTests().catch(console.error);
