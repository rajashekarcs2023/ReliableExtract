const puppeteer = require('puppeteer');
const fs = require('fs');
const crypto = require('crypto');
const agentStep = require('./agent');

function hashBuffer(buffer) {
  return crypto.createHash('md5').update(buffer).digest('hex');
}

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://v0-clean-react-website.vercel.app/');

  let lastAction = 'none';
  const maxIterations = 10;

  for (let i = 0; i < maxIterations; i++) {
    const dom = await page.evaluate(() => {
      return document.body.innerText.slice(0, 2000);
    });

    const screenshotBuffer = await page.screenshot();
    const imageHash = hashBuffer(screenshotBuffer);
    fs.appendFileSync('agent_log.json', JSON.stringify({ iteration: i, imageHash }) + "\n");

    const action = await agentStep(dom, lastAction, screenshotBuffer, i);

    console.log(`\n🔁 Iteration ${i + 1}`);
    console.log('🤖 Agent says:', action);

    if (action.startsWith("⚠️")) {
      console.log("🛑 Loop detected! Escalating.");
      break;
    }

    try {
      if (action.toLowerCase().includes("type name")) {
        await page.type('#nameInput', 'Alice', { delay: 100 });
        lastAction = "Typed name";
      } else if (action.toLowerCase().includes("type email")) {
        await page.type('#emailInput', 'alice@example.com', { delay: 100 });
        lastAction = "Typed email";
      } else if (action.toLowerCase().includes("click next to step 2")) {
        await page.click('#nextToStep2');
        lastAction = "Clicked next to step 2";
        await page.waitForTimeout(1000);
      } else if (action.toLowerCase().includes("select topic")) {
        await page.select('#topicSelect', 'Agent Reliability');
        lastAction = "Selected topic";
      } else if (action.toLowerCase().includes("check")) {
        await page.click('#termsCheckbox');
        lastAction = "Checked terms";
      } else if (action.toLowerCase().includes("click next to step 3")) {
        await page.click('#nextToStep3');
        lastAction = "Clicked next to step 3";
        await page.waitForTimeout(1000);
      } else if (action.toLowerCase().includes("click submit")) {
        await page.click('#submitButton');
        lastAction = "Clicked submit";
        await page.waitForSelector('#successMessage', { timeout: 5000 });
        console.log("🎉 Success message detected. Submission complete.");
        break;
      } else {
        console.log("❌ Unrecognized action. Exiting.");
        break;
      }
    } catch (err) {
      console.log("⚠️ Action failed:", err.message);
      lastAction = "Failed action";
    }
  }

  await browser.close();
})();
