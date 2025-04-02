chrome.runtime.onInstalled.addListener(() => {
  console.log('Sahayog Auto Login extension installed');
});

// Listen for when a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Check if the page is fully loaded and is the login page
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('sahayog.uknowva.com')) {
    // Execute content script to check if we need to auto-login
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: checkAndLogin
    });
  }
});

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'scheduledLogin') {
    console.log('Scheduled login time reached');
    
    // Open the login page
    chrome.tabs.create({ url: 'https://sahayog.uknowva.com/' }, function(newTab) {
      // Wait for the page to load before attempting to login
      setTimeout(function() {
        chrome.tabs.sendMessage(newTab.id, {action: "performLogin"}, function(response) {
          if (chrome.runtime.lastError) {
            // Content script not ready, inject it first
            chrome.scripting.executeScript({
              target: { tabId: newTab.id },
              files: ['content.js']
            }, function() {
              // Now try sending the message again
              setTimeout(function() {
                chrome.tabs.sendMessage(newTab.id, {action: "performLogin"});
              }, 1000);
            });
          }
        });
      }, 2000);
    });
  }
});

function checkAndLogin() {
  // This function will be executed in the context of the page
  // Check if we're on the login page
  if (document.querySelector('form[action*="login"]') || 
      document.querySelector('input[type="password"]')) {
    // Send a message to the content script to perform login
    chrome.runtime.sendMessage({action: "autoLogin"});
  }
}