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

// Function to find or create a Sahayog tab
function findOrCreateSahayogTab(callback) {
  // First check if there's already a tab with sahayog.uknowva.com
  chrome.tabs.query({url: "*://sahayog.uknowva.com/*"}, function(tabs) {
    if (tabs.length > 0) {
      // Found an existing tab, activate it
      chrome.tabs.update(tabs[0].id, {active: true}, function() {
        callback(tabs[0]);
      });
    } else {
      // No existing tab, create a new one
      chrome.tabs.create({ url: 'https://sahayog.uknowva.com/' }, function(newTab) {
        callback(newTab);
      });
    }
  });
}

// Listen for alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'scheduledLogin') {
    console.log('Scheduled login time reached');
    
    // Check if we should still login (not logged out yet)
    chrome.storage.sync.get(['loggedIn'], function(result) {
      if (result.loggedIn === false) {
        console.log('Already logged out for today, skipping login');
        return;
      }
      
      // Find or create a Sahayog tab
      findOrCreateSahayogTab(function(tab) {
        // Wait for the page to load before attempting to login
        setTimeout(function() {
          chrome.tabs.sendMessage(tab.id, {action: "performLogin"}, function(response) {
            if (chrome.runtime.lastError) {
              // Content script not ready, inject it first
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
              }, function() {
                // Now try sending the message again
                setTimeout(function() {
                  chrome.tabs.sendMessage(tab.id, {action: "performLogin"});
                }, 1000);
              });
            }
          });
        }, 2000);
      });
    });
  } else if (alarm.name === 'scheduledLogout') {
    console.log('Scheduled logout time reached');
    
    // Find or create a Sahayog tab
    findOrCreateSahayogTab(function(tab) {
      // Wait for the page to load before attempting to logout
      setTimeout(function() {
        chrome.tabs.sendMessage(tab.id, {action: "performLogout"}, function(response) {
          if (chrome.runtime.lastError) {
            // Content script not ready, inject it first
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              files: ['content.js']
            }, function() {
              // Now try sending the message again
              setTimeout(function() {
                chrome.tabs.sendMessage(tab.id, {action: "performLogout"});
              }, 1000);
            });
          }
        });
      }, 2000);
      
      // Mark as logged out for today
      chrome.storage.sync.set({loggedIn: false});
      
      // Reset the logged in state at midnight
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const timeUntilMidnight = midnight.getTime() - Date.now();
      
      setTimeout(function() {
        chrome.storage.sync.set({loggedIn: true});
      }, timeUntilMidnight);
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