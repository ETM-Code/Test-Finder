require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const AdblockerPlugin = require('puppeteer-extra-plugin-adblocker');
const { authenticator } = require('otplib');
const { google } = require('googleapis');
const schedule = require('node-schedule');
const fs = require('fs').promises;
const readline = require('readline');

// Global variables to switch between modes
const TEST_MODE = false; // Set to false for actual functionality
const GET_NEW_TOKEN_MODE = 'false';

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

// Use environment variables loaded from .env file
const TO_EMAIL = process.env.GMAIL_TO;
const myGovIDUsername = process.env.MYGOVID_USERNAME;
const myGovIDPassword = process.env.MYGOVID_PASSWORD;
const CLIENT_SECRET_PATH = process.env.CLIENT_SECRET_PATH;
const AUTHENTICATOR_SECRET_KEY = process.env.AUTHENTICATOR_SECRET_KEY;

// Function to authorize Gmail API
async function authorize() {
  console.log('Starting authorization process...');
  try {
    console.log('Reading client secret file from:', CLIENT_SECRET_PATH);
    const credentials = JSON.parse(await fs.readFile(CLIENT_SECRET_PATH));
    console.log('Client secret file read successfully');

    const { client_secret, client_id, redirect_uris } = credentials.installed;
    console.log('Creating OAuth2 client...');
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    console.log('OAuth2 client created');

    try {
      console.log('Attempting to read token.json...');
      const token = JSON.parse(await fs.readFile('token.json'));
      console.log('Token file read successfully');
      oAuth2Client.setCredentials(token);
      console.log('Credentials set from token file');

      // Test the token
      try {
        await oAuth2Client.getAccessToken();
      } catch (error) {
        console.log('Token is invalid or expired. Getting new token...');
        return getNewToken(oAuth2Client);
      }
    } catch (error) {
      console.log('Error reading token file:', error.message);
      console.log('Getting new token...');
      return getNewToken(oAuth2Client);
    }

    console.log('Authorization successful');
    return oAuth2Client;
  } catch (error) {
    console.error('Error in authorize function:', error);
    throw error;
  }
}

// Function to get new token
async function getNewToken(oAuth2Client) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.send'],
    prompt: 'consent'  // This forces the consent screen to appear, ensuring a refresh token is returned
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const code = await new Promise(resolve => {
    rl.question('Enter the code from that page here: ', (code) => {
      rl.close();
      resolve(code);
    });
  });
  const { tokens } = await oAuth2Client.getToken(code);
  oAuth2Client.setCredentials(tokens);
  await fs.writeFile('token.json', JSON.stringify(tokens));
  console.log('Token stored to token.json');
  return oAuth2Client;
}

// Function to send email
async function sendEmail(auth, text) {
  const gmail = google.gmail({ version: 'v1', auth });
  const subject = 'Urgent: Driving Test Available!';
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const messageParts = [
    'From: "Driving Test Checker" <your.email@gmail.com>',
    `To: ${TO_EMAIL}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${utf8Subject}`,
    '',
    'Driving test slots are available in Carnmore, Galway! Log in now to book!',
    'Site Text: ' + text
  ];
  const message = messageParts.join('\n');
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });
    console.log('Email sent successfully!');
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

// New function for Gmail test
async function testGmailFunctionality() {
  console.log('Starting Gmail test...');
  try {
    const auth = await authorize();
    const testText = 'This is a test email from the Driving Test Checker application.';
    await sendEmail(auth, testText);
    console.log('Gmail test completed successfully.');
  } catch (error) {
    console.error('Gmail test failed:', error);
  }
}

// New function to get a new refresh token
async function getNewRefreshToken() {
  console.log('Starting process to get a new refresh token...');
  try {
    console.log('Reading client secret file from:', CLIENT_SECRET_PATH);
    const credentials = JSON.parse(await fs.readFile(CLIENT_SECRET_PATH));
    console.log('Client secret file read successfully');

    const { client_secret, client_id, redirect_uris } = credentials.installed;
    console.log('Creating OAuth2 client...');
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    console.log('OAuth2 client created');

    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.send'],
      prompt: 'consent'  // This forces the consent screen to appear, ensuring a refresh token is returned
    });
    console.log('Authorize this app by visiting this url:', authUrl);
    
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    const code = await new Promise(resolve => {
      rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        resolve(code);
      });
    });

    const { tokens } = await oAuth2Client.getToken(code);
    console.log('New tokens received');
    
    if (tokens.refresh_token) {
      console.log('Refresh token successfully obtained');
      await fs.writeFile('token.json', JSON.stringify(tokens));
      console.log('New tokens saved to token.json');
    } else {
      console.log('No refresh token received. Make sure you have revoked access for this application in your Google account and try again.');
    }

  } catch (error) {
    console.error('Error getting new refresh token:', error);
  }
}

let retryAttempt = 0;

async function attemptButtonClick() {
  console.log('Waiting for 10 seconds...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // Click the first button that matches the specified style
  console.log('Clicking the first matching button...');
  try {
    await page.waitForFunction(
      () => {
        const buttons = document.querySelectorAll('button.mat-raised-button');
        return buttons.length > 1;
      },
      { timeout: 20000 }
    );

    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button.mat-raised-button');
      if (buttons.length > 1) {
        buttons[1].click();
      }
    });
    
    // Wait for navigation to complete after clicking the button
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
    console.log('Successfully navigated to the next page after clicking the button.');
    retryAttempt = 0; // Reset retry attempt on success
  } catch (error) {
    console.log('Error occurred while clicking the first matching button:', error.message);
    if (retryAttempt === 0) {
      retryAttempt++;
      console.log('Attempting to reload the page and retry...');
      await page.goto('https://myroadsafety.rsa.ie/portal/my-goal/c36d94ce-0a8b-ee11-af86-005056b9b50c', { waitUntil: 'networkidle0' });
      await attemptButtonClick(); // Retry the function
    } else {
      console.log('Second attempt failed. Sending error email...');
      // Send email notification about the error
      console.log('Authorizing email for error notification...');
      const auth = await authorize();
      console.log('Sending email notification about the error...');
      const errorMessage = 'The Driving Test Checker encountered an error while attempting to click the button. The website structure might have changed. Please check the website for any unusual behavior.';
      await sendEmail(auth, errorMessage);
      console.log('Error notification email sent.');
      throw error; // Re-throw the error to be caught by the outer try-catch
    }
  }
}

async function checkDrivingTestAvailability() {
  if (TEST_MODE) {
    console.log('Running in test mode. Only testing Gmail functionality.');
    await testGmailFunctionality();
    return;
  }

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  try {
    console.log('Starting...');
    // Step 1: Access the initial URL
    console.log('Attempting to access initial URL...');
    const ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36";
    await page.setUserAgent(ua);
    await page.goto('https://myroadsafety.rsa.ie/portal/my-goal/c36d94ce-0a8b-ee11-af86-005056b9b50c', { waitUntil: 'networkidle0' });
    console.log('Initial page loaded.');

    // Step 2: Wait to see if redirected to queue
    console.log('Checking for queue redirection...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for  seconds to see if redirected

    if (page.url().includes('rsaie.queue-it.net')) {
      console.log('In queue. Waiting...');
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 300000 }); // 5 minutes timeout
      console.log('Queue wait completed.');
    } else {
      console.log('No queue encountered.');
    }

    // Step 3: Accept cookies and dismiss "Welcome to MyRoadSafety" popup
    console.log('Accepting cookies...');
    const acceptCookiesButton = await page.$('button#onetrust-accept-btn-handler');
    if (acceptCookiesButton) {
      await acceptCookiesButton.click();
      console.log('Cookies accepted.');
    } else {
      console.log('No cookie acceptance button found.');
    }

    console.log('Dismissing welcome popup...');
    const dismissButton = await page.$('button[mat-dialog-close][aria-label="close modal"]');
    if (dismissButton) {
      await dismissButton.click();
      console.log('Welcome popup dismissed.');
    } else {
      console.log('No welcome popup found.');
    }

    // Step 4: Click "Continue with myGovID" button
    console.log('Clicking Continue with myGovID...');
    await page.waitForSelector('button#myGov');
    await page.evaluate(() => {
        const button = document.querySelector('button#myGov');
        if (button) {
            button.click();
        } else {
            throw new Error('Continue with myGovID button not found');
        }
    });
    console.log('Clicked Continue with myGovID.');
    // Step 5: Handle "Once you log in using MyGovID" popup
    console.log('Handling MyGovID confirmation popup...');
    try {
      await page.waitForSelector('button.mat-flat-button.mat-primary', { timeout: 5000 });
      await page.evaluate(() => {
        const buttons = document.querySelectorAll('button.mat-flat-button.mat-primary');
        const continueButton = Array.from(buttons).find(button => button.textContent.trim() === 'Continue');
        if (continueButton) {
          continueButton.click();
        } else {
          throw new Error('Continue button not found');
        }
      });
      console.log('Clicked Continue on MyGovID confirmation popup.');
    } catch (error) {
      console.log('Error handling MyGovID confirmation popup:', error.message);
    }

    // Wait for navigation after clicking the continue button
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 }).catch(() => {
        console.log('Navigation timeout occurred after clicking continue button');
    });

    // Input MyGovID credentials
    console.log('Entering MyGovID credentials...');
    await page.waitForSelector('#email');
    await page.type('#email', myGovIDUsername);
    await page.type('#password', myGovIDPassword);
    
    // Click the login button
    console.log('Clicking login button...');
    await page.waitForSelector('button#next[type="submit"][form="localAccountForm"]');
    await page.evaluate(() => {
        const loginButton = document.querySelector('button#next[type="submit"][form="localAccountForm"]');
        if (loginButton) {
            loginButton.click();
        } else {
            throw new Error('Login button not found');
        }
    });
    console.log('Clicked login button.');
    
    // Wait for 2FA input
    console.log('Waiting for 2FA input...');
    await page.waitForSelector('#otpCode', { timeout: 30000 }).catch(() => {
        console.log('Timeout waiting for 2FA input field');
    });
    
    // Generate 2FA code
    const totp = require('otplib').authenticator;
    const twoFactorCode = totp.generate(AUTHENTICATOR_SECRET_KEY);
    
    // Input 2FA code
    console.log('Entering 2FA code...');
    await page.type('#otpCode', twoFactorCode);
    
    // Wait for navigation to complete
    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 }).catch(() => {
        console.log('Navigation timeout occurred after 2FA verification');
    });
    console.log('Logged in successfully.');

    // Wait for 3 seconds after reaching the page
    console.log('Waiting for 10 seconds...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Click the first button that matches the specified style
    console.log('Clicking the first matching button...');
    try {
        await page.waitForFunction(
            () => {
                const buttons = document.querySelectorAll('button.mat-raised-button');
                return buttons.length > 1;
            },
            { timeout: 20000 }
        );

        await page.evaluate(() => {
            const buttons = document.querySelectorAll('button.mat-raised-button');
            if (buttons.length > 1) {
                buttons[1].click();
            }
        });
        
        // Wait for navigation to complete after clicking the button
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
        console.log('Successfully navigated to the next page after clicking the button.');
    } catch (error) {
        console.log('Error occurred while clicking the first matching button:', error.message);
    }

    console.log('Waiting for the first "mat-raised-button" button...');
    try {
        await page.waitForSelector('button.mat-raised-button', { visible: true, timeout: 30000 });
        console.log('Clicking the first "mat-raised-button" button...');
        await page.evaluate(() => {
            const buttons = document.querySelectorAll('button.mat-raised-button');
            if (buttons.length > 0) {
                buttons[0].click();
            }
        });
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 60000 });
        console.log('On the next page after clicking the button.');
    } catch (error) {
        console.log('Error occurred while clicking the first "mat-raised-button" button:', error.message);
    }
    // Step 7: Open location dropdown and select Galway (Carnmore)
    console.log('Waiting for location dropdown...');
    try {
      await page.waitForSelector('button#button3', { visible: true, timeout: 60000 }); // Increased timeout to 60 seconds
      console.log('Opening location dropdown...');
      await page.click('button#button3');
      console.log('Waiting for 20 seconds...');
      await new Promise(resolve => setTimeout(resolve, 20000)); // Wait for 20 seconds

      console.log('Checking for test availability...');
      const locationOptions = await page.$$eval('.mat-menu-content button.mat-menu-item', (buttons) => {
        return buttons.map(button => ({
          name: button.querySelector('div[style="flex: 0 0 50%;"]')?.textContent.trim(),
          availability: button.querySelector('span.float-right.text-primary')?.textContent.trim()
        }));
      });

      let testsAvailable = false;
      let testsText = '';
      for (const option of locationOptions) {
        if (option.availability !== 'No availability' ) {
          testsAvailable = true;
          testsText = option.availability;
          break;
        }
      }

      if (testsAvailable) {
        console.log('Tests are available in Galway (Carnmore)!');
        // Send email notification
        console.log('Authorizing email...');
        const auth = await authorize();
        console.log('Sending email notification...');
        await sendEmail(auth, testsText);
        console.log('Email notification sent.');
      } else {
        console.log('No tests available in Galway (Carnmore) at this time.');
      }
    } catch (selectorError) {
      console.error('Error waiting for button#button3:', selectorError);
      // You might want to take a screenshot here to see what the page looks like
      await page.screenshot({path: 'error-screenshot.png'});
      
      // Send email notification about the error
      console.log('Authorizing email for error notification...');
      const auth = await authorize();
      console.log('Sending email notification about the error...');
      const errorMessage = 'The Driving Test Checker encountered an error. The website structure might have changed. Please check the website for any unusual behavior.';
      await sendEmail(auth, errorMessage);
      console.log('Error notification email sent.');
      
      // Re-throw the error to be caught by the outer try-catch
      throw selectorError;
    }

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    console.log('Closing browser...');
    await browser.close();
    console.log('Browser closed.');
  }
}

// Modify the main execution logic
async function main() {
  if (GET_NEW_TOKEN_MODE === 'true') {
    console.log('Getting new token...');
    const credentials = JSON.parse(await fs.readFile(CLIENT_SECRET_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    await getNewToken(oAuth2Client);
  } else if (TEST_MODE) {
    console.log('Running in test mode. Only testing Gmail functionality.');
    await testGmailFunctionality();
  } else {
    const job = schedule.scheduleJob('*/15 * * * *', function() {
      const timestamp = new Date().toISOString();
      console.log(`Running scheduled check at ${timestamp}...`);
      checkDrivingTestAvailability();
    });
    console.log('Scheduler started. Press Ctrl+C to exit.');
    
    // Initial run
    await checkDrivingTestAvailability();
  }
}

// Run the main function
if (require.main === module) {
  main().catch(error => console.error('Error in main execution:', error));
}
