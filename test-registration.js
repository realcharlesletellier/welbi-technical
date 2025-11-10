// Test script for event registration mutations
const API_URL = 'http://localhost:4000/graphql';

async function graphqlRequest(query, variables = {}, userId = '2') {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-dev-user-id': userId,
    },
    body: JSON.stringify({ query, variables }),
  });
  
  const result = await response.json();
  if (result.errors) {
    console.error('GraphQL Errors:', result.errors);
  }
  return result.data;
}

async function getEvent(eventId) {
  const query = `
    query GetEvent($id: ID!) {
      event(id: $id) {
        id
        title
        currentParticipants
        maxParticipants
        availableSpots
        isRegistered
        registrationRequired
      }
    }
  `;
  return await graphqlRequest(query, { id: eventId });
}

async function registerForEvent(eventId, userId) {
  const mutation = `
    mutation RegisterForEvent($eventId: ID!) {
      registerForEvent(eventId: $eventId) {
        success
        message
        event {
          id
          currentParticipants
          isRegistered
        }
      }
    }
  `;
  return await graphqlRequest(mutation, { eventId }, userId);
}

async function cancelRegistration(eventId, userId) {
  const mutation = `
    mutation CancelRegistration($eventId: ID!) {
      cancelEventRegistration(eventId: $eventId) {
        success
        message
        event {
          id
          currentParticipants
          isRegistered
        }
      }
    }
  `;
  return await graphqlRequest(mutation, { eventId }, userId);
}

async function runTests() {
  console.log('🧪 Starting Event Registration Tests\n');
  console.log('=' .repeat(60));
  
  const EVENT_ID = '1';
  
  // Test 1: Check initial state
  console.log('\n📊 TEST 1: Check Initial State');
  console.log('-'.repeat(60));
  const initial = await getEvent(EVENT_ID);
  console.log('Initial Event State:', JSON.stringify(initial.event, null, 2));
  const initialCount = initial.event.currentParticipants;
  
  // Test 2: Register User 2
  console.log('\n✅ TEST 2: Register User 2');
  console.log('-'.repeat(60));
  const reg1 = await registerForEvent(EVENT_ID, '2');
  console.log('Registration Result:', reg1.registerForEvent.success);
  console.log('Message:', reg1.registerForEvent.message);
  console.log('Current Participants:', reg1.registerForEvent.event?.currentParticipants);
  console.log('Is Registered:', reg1.registerForEvent.event?.isRegistered);
  
  // Test 3: Try duplicate registration (should fail)
  console.log('\n❌ TEST 3: Try Duplicate Registration (Should Fail)');
  console.log('-'.repeat(60));
  const reg2 = await registerForEvent(EVENT_ID, '2');
  console.log('Registration Result:', reg2.registerForEvent.success);
  console.log('Message:', reg2.registerForEvent.message);
  
  // Test 4: Register User 3
  console.log('\n✅ TEST 4: Register User 3');
  console.log('-'.repeat(60));
  const reg3 = await registerForEvent(EVENT_ID, '3');
  console.log('Registration Result:', reg3.registerForEvent.success);
  console.log('Message:', reg3.registerForEvent.message);
  console.log('Current Participants:', reg3.registerForEvent.event?.currentParticipants);
  
  // Test 5: Register User 4
  console.log('\n✅ TEST 5: Register User 4');
  console.log('-'.repeat(60));
  const reg4 = await registerForEvent(EVENT_ID, '4');
  console.log('Registration Result:', reg4.registerForEvent.success);
  console.log('Message:', reg4.registerForEvent.message);
  console.log('Current Participants:', reg4.registerForEvent.event?.currentParticipants);
  
  // Test 6: Verify count accuracy
  console.log('\n🔍 TEST 6: Verify Count Accuracy');
  console.log('-'.repeat(60));
  const afterRegs = await getEvent(EVENT_ID);
  console.log('Current Participants:', afterRegs.event.currentParticipants);
  console.log('Expected:', initialCount + 3);
  console.log('Match:', afterRegs.event.currentParticipants === initialCount + 3 ? '✅ PASS' : '❌ FAIL');
  
  // Test 7: Cancel User 3's registration
  console.log('\n🚫 TEST 7: Cancel User 3 Registration');
  console.log('-'.repeat(60));
  const cancel1 = await cancelRegistration(EVENT_ID, '3');
  console.log('Cancellation Result:', cancel1.cancelEventRegistration.success);
  console.log('Message:', cancel1.cancelEventRegistration.message);
  console.log('Current Participants:', cancel1.cancelEventRegistration.event?.currentParticipants);
  
  // Test 8: Verify count after cancellation
  console.log('\n🔍 TEST 8: Verify Count After Cancellation');
  console.log('-'.repeat(60));
  const afterCancel = await getEvent(EVENT_ID);
  console.log('Current Participants:', afterCancel.event.currentParticipants);
  console.log('Expected:', initialCount + 2);
  console.log('Match:', afterCancel.event.currentParticipants === initialCount + 2 ? '✅ PASS' : '❌ FAIL');
  
  // Test 9: Try to cancel non-existent registration (should fail)
  console.log('\n❌ TEST 9: Try to Cancel Non-Existent Registration (Should Fail)');
  console.log('-'.repeat(60));
  const cancel2 = await cancelRegistration(EVENT_ID, '5');
  console.log('Cancellation Result:', cancel2.cancelEventRegistration.success);
  console.log('Message:', cancel2.cancelEventRegistration.message);
  
  // Test 10: Register without authentication (should fail)
  console.log('\n❌ TEST 10: Register Without Authentication (Should Fail)');
  console.log('-'.repeat(60));
  try {
    const noAuth = await graphqlRequest(`
      mutation {
        registerForEvent(eventId: "${EVENT_ID}") {
          success
          message
        }
      }
    `, {}, null);
    console.log('Registration Result:', noAuth.registerForEvent.success);
    console.log('Message:', noAuth.registerForEvent.message);
  } catch (error) {
    console.log('Error (expected):', error.message);
  }
  
  // Final Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 FINAL SUMMARY');
  console.log('='.repeat(60));
  const final = await getEvent(EVENT_ID);
  console.log('Final Event State:', JSON.stringify(final.event, null, 2));
  console.log('\n✅ All tests completed!');
}

// Run tests
runTests().catch(console.error);
