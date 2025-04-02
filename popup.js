document.addEventListener('DOMContentLoaded', function() {
  // Load saved credentials
  chrome.storage.sync.get(['username', 'password'], function(result) {
    if (result.username) {
      document.getElementById('username').value = result.username;
    }
    if (result.password) {
      document.getElementById('password').value = result.password;
    }
  });

  // Save credentials
  document.getElementById('save').addEventListener('click', function() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    if (!username || !password) {
      showStatus('Please enter both username and password', 'error');
      return;
    }
    
    chrome.storage.sync.set({
      username: username,
      password: password
    }, function() {
      showStatus('Credentials saved successfully!', 'success');
    });
  });

  // Login now
  document.getElementById('login').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs.length === 0) {
        showStatus('No active tab found', 'error');
        return;
      }
      
      const currentTab = tabs[0];
      const currentUrl = currentTab.url || '';
      
      if (!currentUrl.includes('sahayog.uknowva.com')) {
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
      } else {
        // Check if content script is ready before sending message
        try {
          chrome.tabs.sendMessage(currentTab.id, {action: "ping"}, function(response) {
            if (chrome.runtime.lastError) {
              // Content script not ready, inject it first
              chrome.scripting.executeScript({
                target: { tabId: currentTab.id },
                files: ['content.js']
              }, function() {
                // Now try sending the message again
                setTimeout(function() {
                  chrome.tabs.sendMessage(currentTab.id, {action: "performLogin"});
                }, 500);
              });
            } else {
              // Content script is ready, send the message
              chrome.tabs.sendMessage(currentTab.id, {action: "performLogin"});
            }
          });
        } catch (error) {
          showStatus('Error communicating with the page: ' + error.message, 'error');
        }
      }
    });
  });

  function showStatus(message, type) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = 'status ' + type;
    statusElement.style.display = 'block';
    
    setTimeout(function() {
      statusElement.style.display = 'none';
    }, 3000);
  }
});