const http = require('http')
const fs = require('fs')
const path = require('path')

const projectsDir = path.join(__dirname, 'projects', 'test-project')
const planFile = path.join(projectsDir, 'PROJECT-PLAN.md')

// Ensure directory exists
fs.mkdirSync(projectsDir, { recursive: true })

console.log('Connecting to SSE endpoint...')

const req = http.get('http://localhost:3000/api/events', (res) => {
  console.log('Connected! Status:', res.statusCode)
  
  res.on('data', (chunk) => {
    const text = chunk.toString().trim()
    if (text.startsWith('data:')) {
      console.log('EVENT:', text)
    } else if (text.startsWith(':')) {
      console.log('(keepalive)')
    }
  })
  
  res.on('end', () => {
    console.log('Connection closed')
  })
})

req.on('error', (e) => {
  console.error('Request error:', e.message)
  process.exit(1)
})

// Wait for connection, then trigger file changes
setTimeout(() => {
  console.log('\n--- Triggering file change ---')
  fs.writeFileSync(planFile, `# Test Plan\nUpdated at ${new Date().toISOString()}`)
}, 2000)

// Wait a bit longer and trigger another change
setTimeout(() => {
  console.log('\n--- Triggering second file change ---')
  fs.appendFileSync(planFile, '\n\nMore content added')
}, 8000)

// Close after test
setTimeout(() => {
  console.log('\n--- Test complete, closing ---')
  req.destroy()
  process.exit(0)
}, 12000)
