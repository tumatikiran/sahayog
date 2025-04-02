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

function checkAndLogin() {
  // This function will be executed in the context of the page
  // Check if we're on the login page
  if (document.querySelector('form[action*="login"]') || 
      document.querySelector('input[type="password"]')) {
    // Send a message to the content script to perform login
    chrome.runtime.sendMessage({action: "autoLogin"});
  }
}