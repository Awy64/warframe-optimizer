import { chromium } from 'playwright'

async function run() {
  console.log('=== Starting UI Browser Validation ===')
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  
  try {
    console.log('Navigating to local dev server http://localhost:5174/ ...')
    await page.goto('http://localhost:5174/')
    
    // Wait for the header to render
    await page.waitForSelector('text=PRAPA', { timeout: 8000 })
    console.log('✓ Found PRAPA header!')
    
    // 1. Search and add "Orokin Cell"
    console.log('Searching for "Orokin Cell" in combobox...')
    const searchInput = page.locator('input[role="combobox"]')
    await searchInput.fill('Orokin Cell')
    
    // Wait for results
    await page.waitForSelector('button:has-text("Orokin Cell")', { timeout: 4000 })
    console.log('✓ Combobox results rendered!')
    
    // Press Enter to select the first highlighted item
    await searchInput.press('Enter')
    
    // Check that Orokin Cell is in the cart
    await page.waitForSelector('li:has-text("Orokin Cell")', { timeout: 4000 })
    console.log('✓ "Orokin Cell" successfully added to objective cart!')
    
    // 2. Search and add "Plastids"
    console.log('Searching for "Plastids"...')
    await searchInput.fill('Plastids')
    await page.waitForSelector('button:has-text("Plastids")', { timeout: 4000 })
    await searchInput.press('Enter')
    
    // Check that Plastids is in the cart
    await page.waitForSelector('li:has-text("Plastids")', { timeout: 4000 })
    console.log('✓ "Plastids" successfully added to objective cart!')
    
    // Wait for WASM route calculations
    console.log('Waiting for route calculation...')
    await page.waitForSelector('text=Golden Path', { timeout: 8000 })
    console.log('✓ Golden Path timeline is visible!')
    
    // Verify that primary route starter location is rendered
    const starterText = await page.locator('span.text-tenno-cyan.font-bold').first().innerText()
    console.log(`✓ Optimal starting location: ${starterText}`)
    
    // 3. Test Skill Slider
    console.log('Adjusting skill slider to 0.2 (Casual)...')
    const slider = page.locator('input[type="range"]')
    await slider.fill('0.2')
    
    // Wait for debounced calculation (300ms + WASM execution)
    await page.waitForTimeout(1000)
    
    // Check updated label
    const labelText = await page.locator('text=Casual / Novice').innerText()
    console.log(`✓ Skill slider label updated successfully: ${labelText}`)
    
    // Take a screenshot of the completed state
    const screenshotPath = '/Users/adamyoung/.gemini/antigravity/brain/732cb455-a580-48d3-90b5-e9ae4322088d/dashboard_validation.png'
    await page.screenshot({ path: screenshotPath, fullPage: true })
    console.log(`✓ Screenshot of Orbiter Console captured at: ${screenshotPath}`)
    
    console.log('=== Browser Validation Completed Successfully ===')
  } catch (error) {
    console.error('❌ Browser validation failed:', error)
    process.exit(1)
  } finally {
    await browser.close()
  }
}

run()
