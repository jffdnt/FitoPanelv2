# SharePoint Panel Chatbot - Configuration Guide

This document provides instructions for configuring and deploying the SharePoint Panel Chatbot solution.

## Configuration Steps

1. **Update Credentials in elements.xml**

   Navigate to `/sharepoint/assets/elements.xml` and update the following placeholders with your actual values:

   ```xml
   ClientSideComponentProperties="{
     &quot;botURL&quot;:&quot;YOUR_BOT_URL&quot;,
     &quot;customScope&quot;:&quot;YOUR_CUSTOM_SCOPE&quot;,
     &quot;clientID&quot;:&quot;YOU_CLIENT_ID&quot;,
     &quot;authority&quot;:&quot;YOUR_AAD_LOGIN_URL&quot;,
     &quot;greet&quot;:true,
     &quot;buttonLabel&quot;:&quot;CHAT_BUTTON_LABEL&quot;,
     &quot;botName&quot;:&quot;BOT_NAME&quot;
   }"
   ```

   - `YOUR_BOT_URL`: The URL of your Copilot Studio bot
   - `YOUR_CUSTOM_SCOPE`: The custom scope from your Azure AD app registration
   - `YOU_CLIENT_ID`: The client ID from your Azure AD app registration
   - `YOUR_AAD_LOGIN_URL`: Your Azure AD tenant login URL
   - `CHAT_BUTTON_LABEL`: The label for the chat button
   - `BOT_NAME`: The name of your bot

2. **Build and Package the Solution**

   Run the following commands in the solution directory:

   ```bash
   npm install
   gulp bundle --ship
   gulp package-solution --ship
   ```

   This will create a `.sppkg` file in the `sharepoint/solution` folder.

3. **Deploy to SharePoint**

   Upload the `.sppkg` file to your SharePoint App Catalog and deploy it to your site.

## Key Features

- Uses a Panel surface instead of a Dialog for the chatbot UI
- Maintains silent SSO functionality
- Provides a modern sliding interface for better user experience
- Compatible with SharePoint's design language

## Files Modified from Original Solution

1. Created new file: `src/extensions/pvaSso/components/ChatBotPanel.tsx`
2. Updated: `src/extensions/pvaSso/PvaSsoApplicationCustomizer.ts`

These modifications convert the UI from a dialog to a panel while preserving all functionality.
