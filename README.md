# RSA Driving Test Checker

⚠️ **IMPORTANT DISCLAIMER** ⚠️

**This project exists solely for educational purposes and demonstrates web automation techniques. We do not endorse its use in reality and strongly recommend against using this script for actual driving test booking.**

**Please consider the following:**
- Check the terms of service of myroadsafety.rsa.ie before using any automation tools
- Automated checking may place unnecessary load on the RSA's servers
- In the interest of fairness to all driving test candidates, we recommend using only the official booking system
- Use of this script may violate the website's terms of service

---

## Overview

This Node.js script periodically monitors the RSA (Road Safety Authority) driving test website for available test cancellations in your local area (Carnmore used as an example) and sends email notifications when slots become available.

## How It Works

1. **Automated Login**: Uses Puppeteer to automate browser interactions and log into the MyGovID system
2. **2FA Authentication**: Automatically generates and enters two-factor authentication codes using TOTP
3. **Navigation**: Navigates through the RSA driving test booking system
4. **Availability Check**: Monitors for available test slots in the specified location
5. **Email Notifications**: Sends Gmail notifications when test slots become available
6. **Scheduled Execution**: Runs automatically every 15 minutes using node-schedule

## Key Technologies

- **Node.js**: Runtime environment
- **Puppeteer**: Headless browser automation with stealth and adblocker plugins
- **Gmail API**: For sending email notifications
- **node-schedule**: Cron-like job scheduler for periodic execution
- **otplib**: TOTP authenticator for 2FA code generation
- **dotenv**: Environment variable management

## Prerequisites

- Node.js (v14 or higher)
- Gmail account with API access enabled
- MyGovID account with 2FA enabled
- Authenticator app (Google Authenticator, Authy, etc.) set up for MyGovID

## Installation

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

### 1. Environment Variables

Create a `.env` file in the project root with the following variables:

```env
GMAIL_TO=your-email@example.com
MYGOVID_USERNAME=your-mygovid-username
MYGOVID_PASSWORD=your-mygovid-password
CLIENT_SECRET_PATH=./client_secret.json
AUTHENTICATOR_SECRET_KEY=your-2fa-secret-key
```

### 2. Gmail API Setup

#### Step 1: Enable Gmail API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Gmail API
4. Go to "Credentials" and create OAuth 2.0 client credentials
5. Download the credentials as `client_secret.json` and place in project root

#### Step 2: Get OAuth Token
1. Set `GET_NEW_TOKEN_MODE = 'true'` in the script
2. Run the script: `node rsaChecker.js`
3. Follow the authorization URL and enter the code
4. The script will create `token.json` automatically
5. Set `GET_NEW_TOKEN_MODE = 'false'` back in the script

### 3. MyGovID 2FA Secret

To get your authenticator secret key:
1. When setting up 2FA on MyGovID, save the secret key (usually shown as QR code)
2. If already set up, you may need to reset 2FA to get the secret key
3. Add this key to your `.env` file as `AUTHENTICATOR_SECRET_KEY`

## Usage

### Test Mode
Set `TEST_MODE = true` in the script to test Gmail functionality without web scraping:
```bash
node rsaChecker.js
```

### Production Mode
Set `TEST_MODE = false` and run:
```bash
node rsaChecker.js
```

The script will:
- Run an initial check immediately
- Schedule checks every 15 minutes
- Send email notifications when tests become available
- Handle errors and send error notifications

## File Structure

```
testFinder/
├── rsaChecker.js          # Main script
├── package.json           # Dependencies
├── .env                   # Environment variables (create this)
├── client_secret.json     # Gmail API credentials (download this)
├── token.json            # OAuth token (auto-generated)
└── README.md             # This file
```

## Dependencies

The project requires these npm packages:

```json
{
  "puppeteer-extra": "Browser automation",
  "puppeteer-extra-plugin-stealth": "Stealth mode for Puppeteer",
  "puppeteer-extra-plugin-adblocker": "Ad blocking",
  "googleapis": "Google APIs client",
  "node-schedule": "Job scheduling",
  "otplib": "TOTP authentication",
  "dotenv": "Environment variables"
}
```

## Error Handling

The script includes comprehensive error handling:
- Retries failed operations
- Sends email notifications for errors
- Takes screenshots on critical failures
- Handles queue systems and timeouts

## Security Considerations

- Never commit `.env`, `client_secret.json`, or `token.json` to version control
- Store credentials securely
- Use app-specific passwords where possible
- Regularly rotate authentication tokens

## Troubleshooting

1. **Gmail API errors**: Ensure API is enabled and credentials are correct
2. **2FA failures**: Verify authenticator secret key is correct
3. **Website changes**: The RSA website structure may change, requiring script updates
4. **Rate limiting**: Be mindful of request frequency to avoid being blocked

## Legal and Ethical Considerations

- **Terms of Service**: Always review and comply with website terms of service
- **Fair Use**: Consider the impact on other users and server resources
- **Educational Purpose**: This code is intended for learning web automation techniques
- **Responsibility**: Users are responsible for their own use of this code

---

**Remember: This script is for educational purposes only. Always respect website terms of service and consider the ethical implications of automated interactions with public services.** 