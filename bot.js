const venom = require('venom-bot');
const puppeteer = require('puppeteer');

const GROUP_ID = '120363419664378978@g.us'; // Replace with your actual group ID

venom.create({
  session: 'badminton-ai',
  executablePath: 'C:\Program Files\Google\Chrome\Application\chrome.exe',
  headless: false,
  puppeteerOptions: {
    userDataDir: 'C:\Users\User\AppData\Local\Google\Chrome\User Data'
  },
  browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
})
.then(client => start(client))
.catch(console.error);

  

async function start(client) {
  console.log('Bot started and listening for messages...');

  client.onMessage(async (message) => {
    try {
      console.log('Received message:', message.body);
      console.log('Is group message:', message.isGroupMsg);
      console.log('Chat ID:', message.chatId);

      if (message.isGroupMsg && message.chatId === GROUP_ID) {
        const msg = message.body.toLowerCase().trim();

        if (msg === 'hi bot') {
          await client.sendText(message.from, 'Hi my name is AI, how can I help you?');
          console.log(`Replied to 'hi' in group ${GROUP_ID}`);
        }

        if (msg === '!groupid') {
          await client.sendText(message.from, `Group ID: ${message.chatId}`);
          console.log(`Sent group ID in group ${GROUP_ID}`);
        }

        if (msg === 'who is the most handsome guy in the world') {
          await client.sendText(message.from, 'Kee Yung Shen');
          console.log(`Replied with 'Kee Yung Shen' to the handsome guy question`);
        }

        if (msg === 'who is the most pretiest girl in the world') {
          await client.sendText(message.from, 'Ong Kai Xin');
          console.log(`Replied with 'Ong Kai Xin' to the prettiest girl question`);
        }

        const match = msg.match(/(\d{1,2}) ([a-z]+) (\d{4}), (.+)/i);
        if (match) {
          const day = match[1].trim();       // e.g. "31"
          const month = match[2].trim();     // e.g. "May"
          const year = match[3].trim();      // e.g. "2025"
          const location = match[4].trim();  // e.g. "DEWAN FREESIA"

          const fullDate = `${day} ${month} ${year}`; // Optional, if you still want the full date string

          await client.sendText(
            message.from,
            `Fetching available time slots for *${location}* on *${fullDate}*, please wait...`
          );

          // Pass day, month, year, and location if needed
          await fetchAvailableSlots(client, message.from, day, month, year, location);
          return;
        }

        if (msg === 'hi bot, said good morning to sky') {
          await client.sendText(message.from, 'Good morning, sky actually im gay, i love you');
          console.log(`Replied to 'hi' in group ${GROUP_ID}`);
        }
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  });
}


// Helper function to type into input based on label text
async function typeInputByLabelText(page, labelText, value) {
  // Find the label div by exact text
  const labelHandles = await page.$x(`//div[contains(@class, 'minput-label-small') and normalize-space(text()) = '${labelText}']`);
  
  if (labelHandles.length === 0) {
    throw new Error(`Label with text "${labelText}" not found`);
  }
  
  const labelHandle = labelHandles[0];
  
  // Evaluate within the page context to find input inside the closest minput-container ancestor
  const inputHandle = await labelHandle.evaluateHandle(labelDiv => {
    // Go up the DOM tree until we find the container with class 'minput-container'
    let container = labelDiv.closest('.minput-container');
    if (!container) return null;
    // Find input inside this container
    return container.querySelector('input.minput[type="text"], input.minput[type="password"]');
  });
  
  if (!inputHandle) {
    throw new Error(`Input near label "${labelText}" not found`);
  }
  
  const inputElem = inputHandle.asElement();
  if (!inputElem) {
    throw new Error(`Input element for label "${labelText}" not found`);
  }
  
  await inputElem.click({ clickCount: 3 });
  await inputElem.type(value);
}



async function scrollAndFindElement(page, xpath, maxScrolls = 10, delay = 500) {
  let element = null;
  const directions = [
    { x: 0, y: 200 },    // scroll down
    { x: 0, y: -200 },   // scroll up
    { x: -200, y: 0 },   // scroll left
    { x: 200, y: 0 },    // scroll right
  ];

  for (let i = 0; i < maxScrolls; i++) {
    element = await page.$x(xpath);
    if (element.length > 0) return element[0];

    const dir = directions[i % directions.length]; // cycle through directions
    await page.evaluate(({ x, y }) => {
      window.scrollBy(x, y);
    }, dir);

    await page.waitForTimeout(delay);
  }

  return null;
}

async function fetchAvailableSlots(client, chatId, day, month, year, location) {
  console.log(`Checking availability:\n- Location: ${location}\n- Date: ${day} ${month} ${year}`);

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });



    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    // Add event listeners **after** creating the page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('error', err => console.log('PAGE ERROR:', err));
    page.on('pageerror', err => console.log('PAGE ERROR:', err));

    await page.goto('https://www.mymbsa.gov.my/tempahan/new', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await page.waitForTimeout(5000);

    // Enter login credentials
    await typeInputByLabelText(page, 'ID Pengguna', '051022-14-1139');
    await typeInputByLabelText(page, 'Kata Laluan', 'Imgenius2@');

    const [loginButton] = await page.$x("//button[contains(., 'Log Masuk')]");
    if (loginButton) {
      await loginButton.click();
    } else {
      throw new Error('Log Masuk button not found');
    }


    await page.waitForTimeout(5000);
    // Wait for the sidebar or the text "myTempahan" to appear
    await page.waitForXPath("//a[text()='myTempahan']");

    // Click the "myTempahan" section
    const myTempahanLink = await scrollAndFindElement(page, "//a[text()='myTempahan']");
    if (myTempahanLink) {
      await myTempahanLink.click();
      await page.waitForTimeout(1000); // short wait to let submenu appear
    } else {
      throw new Error('myTempahan menu not found');
    }

    const tempahanFasiliti = await scrollAndFindElement(page, "//a[text()='Tempahan Fasiliti']");
    if (tempahanFasiliti) {
      await tempahanFasiliti.click();
      await page.waitForTimeout(2000);
    } else {
      throw new Error('"Tempahan Fasiliti" not found');
    }

    await page.waitForTimeout(5000);
        // Wait for the "Permohonan Baharu" button to appear
    // Wait for the button
    await page.waitForXPath("//button[contains(., 'Permohonan Baharu')]");

    // Scroll into view and click it
    const [permohonanButton] = await page.$x("//button[contains(., 'Permohonan Baharu')]");
    if (permohonanButton) {
      await permohonanButton.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await permohonanButton.click();
      await page.waitForTimeout(1000);
    } else {
      throw new Error('"Permohonan Baharu" button not found');
    }


    // Wait and check the "declare" checkbox
    await page.waitForSelector('input[name="declare"]');
    await page.click('input[name="declare"]');

    // Wait and click the "Mula" button
    await page.waitForXPath("//button[normalize-space(text())='Mula']");
    const mulaButton = await scrollAndFindElement(page, "//button[normalize-space(text())='Mula']");
    if (mulaButton) {
      await mulaButton.click();
    } else {
      throw new Error('"Mula" button not found');
    }

    // Wait a bit for the page to process after clicking Mula
    await page.waitForTimeout(3000);

    // 1. Click the dropdown to open the options
    await page.waitForSelector('.css-1ezy6jk-control');
    await page.click('.css-1ezy6jk-control');
    await page.waitForTimeout(500); // wait for options to load



    // 2. Click the "SUKAN" option
    await page.waitForXPath("//div[contains(text(), 'SUKAN')]");
    const [sukanOption] = await page.$x("//div[contains(text(), 'SUKAN')]");
    if (sukanOption) {
      await sukanOption.click();
      await page.waitForTimeout(500);
    } else {
      throw new Error('"SUKAN" option not found');
    }


    // 1. Click the Aktiviti dropdown to open the options
    await page.waitForSelector('.css-1ezy6jk-control');  // this matches the dropdown control, but if there are multiple similar dropdowns, narrow it down
    await page.click('.css-1ezy6jk-control');

    // 2. Wait a bit for options to appear
    await page.waitForTimeout(500);

    // 3. Find and click the option "Badminton"
    await page.waitForXPath("//div[contains(text(), 'BADMINTON')]");

    const [badmintonOption] = await page.$x("//div[contains(text(), 'BADMINTON')]");
    if (badmintonOption) {
      await badmintonOption.click();
      await page.waitForTimeout(500);
    } else {
      throw new Error('"Badminton" option not found');
    }

    try {
    // Get the dropdown container div
    const seksyenContainer = await page.$('div.css-m85scv-control');
    if (!seksyenContainer) throw new Error('Seksyen container not found');

    // Check if visible and has size
    const box = await seksyenContainer.boundingBox();
    if (!box) throw new Error('Seksyen container not visible or has zero size');

    // Scroll into view
    await page.evaluate(el => el.scrollIntoView({behavior: 'smooth', block: 'center'}), seksyenContainer);

    // Click to open dropdown
    await seksyenContainer.click();

    // Optional: small wait to let dropdown render
    await page.waitForTimeout(500);

    // Wait for the option with text 'SEKSYEN U13' to appear
    await page.waitForXPath("//div[contains(text(), 'SEKSYEN U13')]", {timeout: 3000});
    const [option] = await page.$x("//div[contains(text(), 'SEKSYEN U13')]");

    if (option) {
      // Hover and click the option to be safe
      await option.hover();
      await option.click();
      console.log('Selected SEKSYEN U13');
    } else {
      throw new Error('"SEKSYEN U13" option not found');
    }
  } catch (err) {
    console.error('Error selecting Seksyen:', err);
  }

  function normalizeText(text) {
    return text
      .toUpperCase()
      .replace(/\s+/g, ' ')          // collapse multiple spaces
      .replace(/\u00A0/g, ' ')       // convert non-breaking space to normal space
      .trim();
  }

  const normalizedLocation = normalizeText(location);

  // Step 1: Click the dropdown
  const [dropdown] = await page.$x("//span[contains(text(), 'Dewan')]/following::div[contains(@class, 'css-1ezy6jk-control')][1]");
  if (!dropdown) throw new Error("Dropdown not found");
  await dropdown.click();
  console.log("Clicked dropdown");

  // Step 2: Wait for options to appear
  await page.waitForSelector('[class*="option"]', { visible: true, timeout: 5000 });

  // Step 3: Get all options
  const options = await page.$$('[class*="option"]');
  let clicked = false;

  console.log("🔽 Available options:");
  for (const option of options) {
    const rawText = await page.evaluate(el => el.textContent.trim(), option);
    const normalizedText = normalizeText(rawText);
    console.log("-", rawText);

    if (normalizedText === normalizedLocation) {
      await option.click();
      console.log(`✅ Clicked option: ${rawText}`);
      clicked = true;
      break;
    }
  }

  if (!clicked) {
    throw new Error(`❌ Option "${normalizedLocation}" not found`);
  }


  async function navigateToMonthYear(page, targetMonth, targetYear) {
  const monthYearSelector = 'div.flex.gap-2 > p.font-din.font-bold.text-lg';
  const prevButtonSelector = 'button.py-2.px-3.text-3xl.select-none:nth-child(1)';
  const nextButtonSelector = 'button.py-2.px-3.text-3xl.select-none:nth-child(3)';

  // Normalize input
  const targetMonthNormalized = targetMonth.toLowerCase();
  const targetYearStr = targetYear.toString();

  for (let i = 0; i < 20; i++) { // max 20 tries to avoid infinite loop
    // Read displayed month and year
    const [currentMonth, currentYear] = await page.evaluate((sel) => {
      const elements = document.querySelectorAll(sel);
      if (elements.length === 2) {
        return [elements[0].textContent.trim().toLowerCase(), elements[1].textContent.trim()];
      }
      return [null, null];
    }, monthYearSelector);

    if (!currentMonth || !currentYear) {
      throw new Error('Cannot find month/year elements on page');
    }

    if (currentMonth === targetMonthNormalized && currentYear === targetYearStr) {
      console.log(`Calendar on target month/year: ${targetMonth} ${targetYear}`);
      return; // done
    }

    // Decide whether to go forward or backward (simple month-year comparison)
    // For simplicity, convert month names to numbers
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ];

    const currentMonthIndex = monthNames.indexOf(currentMonth);
    const targetMonthIndex = monthNames.indexOf(targetMonthNormalized);

    if (currentYear > targetYearStr || (currentYear === targetYearStr && currentMonthIndex > targetMonthIndex)) {
      // Need to go previous
      await page.click(prevButtonSelector);
      console.log('Clicked previous month button');
    } else {
      // Need to go next
      await page.click(nextButtonSelector);
      console.log('Clicked next month button');
    }

    await page.waitForTimeout(500); // wait for animation/render
  }

  throw new Error(`Could not navigate calendar to ${targetMonth} ${targetYear} after many attempts`);
}


    // Wait for the calendar to appear (rbc-calendar class)
    await page.waitForSelector('.rbc-calendar', { timeout: 100000 });

    // Scroll the calendar into view if needed
    await page.evaluate(() => {
      const calendar = document.querySelector('.rbc-calendar');
      if (calendar) calendar.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    await navigateToMonthYear(page, month, year);  // month = "May", year = "2025"

    // Click on the button with text "31"
    await page.evaluate((day) => {
      const buttons = Array.from(document.querySelectorAll('.rbc-date-cell button'));
      const btn = buttons.find(btn => btn.textContent.trim() === day);
      if (btn) btn.click();
    }, day);

    // Wait for Boleh Tempah event(s) to load under 31st column
    await page.waitForTimeout(1000); // Slight delay in case rendering is async

    // Click on the first "Boleh Tempah" event under the 31st May column
    await page.evaluate((day) => {
    const rows = document.querySelectorAll('.rbc-month-row');
    for (let row of rows) {
      const dateCells = row.querySelectorAll('.rbc-date-cell');
      for (let i = 0; i < dateCells.length; i++) {
        const btn = dateCells[i].querySelector('button');
        if (btn && btn.textContent.trim() === day) {
          const columnIndex = i;
          const segments = row.querySelectorAll('.rbc-row-segment');
          for (let seg of segments) {
            const style = seg.getAttribute('style');
            if (style && style.includes(`${(100 / 7) * columnIndex}%`)) {
              const event = seg.querySelector('.rbc-event-content[title="Boleh Tempah"]');
              if (event) {
                event.click();
                return;
              }
            }
          }
        }
      }
    }
  }, day);

    
    try {
      // Wait for "Boleh Tempah" event to appear (up to 10 seconds)
      await page.waitForXPath(
        "//div[contains(@class, 'rbc-event-content') and normalize-space(text())='Boleh Tempah']",
        { timeout: 10000 }
      );

      // Click the first "Boleh Tempah" slot found
      const [bolehTempahSlot] = await page.$x(
        "//div[contains(@class, 'rbc-event-content') and normalize-space(text())='Boleh Tempah']"
      );
      if (bolehTempahSlot) {
        await bolehTempahSlot.click();
        await page.waitForSelector('div.flex.flex-row', { timeout: 10000 });
      } else {
        // If no slot is found after wait (unexpected fallback)
        await client.sendText(
          chatId,
          `😢 Sorry, *${day} ${month} ${year}* at *${location}* is currently not available for booking.`
        );
        return;
      }
    } catch (error) {
      console.error('Error fetching available slots:', error.message);

      // Send WhatsApp message if timeout occurs or no slot
      await client.sendText(
        chatId,
        `😢 Sorry, *${day} ${month} ${year}* at *${location}* is currently not available for booking.`
      );
      return;
    }



    const bookingDetails = await page.evaluate(() => {
      const container = document.querySelector('div.flex.flex-row');
      if (!container) return null;

      const getTextByLabel = (label) => {
        const labels = Array.from(container.querySelectorAll('span'));
        for (let lbl of labels) {
          if (lbl.textContent.trim() === label) {
            const pElem = lbl.nextElementSibling;
            if (pElem) return pElem.textContent.trim();
          }
        }
        return null;
      };

      return {
        Tarikh: getTextByLabel('Tarikh'),
        Aktiviti: getTextByLabel('Aktiviti'),
        Lokasi: getTextByLabel('Lokasi'),
      };
    });

    const courtData = await page.evaluate(() => {
      const result = [];

      // Each court is in a container with class "flex flex-col..."
      const courtDivs = document.querySelectorAll('div.flex.flex-col.p-4');

      courtDivs.forEach(court => {
        const courtName = court.querySelector('p.font-bold')?.textContent.trim();
        const times = court.querySelectorAll('div.flex.gap-2.items-center.justify-between');

        times.forEach(timeSlot => {
          const timeText = timeSlot.querySelector('span.text-sm')?.textContent.trim();
          const button = timeSlot.querySelector('div.bg-mymbsa-secondaryaccent');

          // Check if the button contains "Boleh Tempah"
          if (button && button.textContent.includes('Boleh Tempah')) {
            result.push({
              court: courtName,
              time: timeText
            });
          }
        });
      });

      return result;
    });

    console.log(courtData);

     if (bookingDetails && bookingDetails.Tarikh && bookingDetails.Aktiviti && bookingDetails.Lokasi) {
      // Format court data
      let courtMessage = '';
      if (courtData && courtData.length > 0) {
        courtMessage = '\n\nSlot Boleh Tempah:\n';

        // Group times by court
        const courtGroups = {};
        courtData.forEach(entry => {
          if (!courtGroups[entry.court]) {
            courtGroups[entry.court] = [];
          }
          courtGroups[entry.court].push(entry.time);
        });

        // Format each group with a blank line between courts
        for (const [courtName, times] of Object.entries(courtGroups)) {
          times.forEach(time => {
            courtMessage += `• ${courtName} - ${time}\n`;
          });
          courtMessage += '\n'; // Add gap between courts
        }
      } else {
        courtMessage = '\n\nTiada slot "Boleh Tempah" dijumpai.';
      }

      // Compose the final message
      const messageText = `Tarikh: ${bookingDetails.Tarikh}\nAktiviti: ${bookingDetails.Aktiviti}\nLokasi: ${bookingDetails.Lokasi}${courtMessage}`;

      try {
        await client.sendText(chatId, messageText);
      } catch (error) {
        console.error('Error sending WhatsApp message:', error);
      }
    } else {
      try {
        await client.sendText(chatId, 'Booking details are missing!');
      } catch (error) {
        console.error('Error sending WhatsApp message:', error);
      }
    }

    // Now send bookingDetails via WhatsApp bot or return it
    console.log(bookingDetails);
    // Example: send message
    // await whatsappClient.sendMessage(groupId, `Tarikh: ${bookingDetails.Tarikh}\nAktiviti: ${bookingDetails.Aktiviti}\nLokasi: ${bookingDetails.Lokasi}`);

  } catch (error) {
    console.error('Error fetching available slots:', error);
    return 'An error occurred while fetching available slots.';
  }
}
