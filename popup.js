document.addEventListener('DOMContentLoaded', function() {
  // Load saved credentials
  chrome.storage.sync.get(['username', 'password', 'scheduledTime'], function(result) {
    if (result.username) {
      document.getElementById('username').value = result.username;
    }
    if (result.password) {
      document.getElementById('password').value = result.password;
    }
    if (result.scheduledTime) {
      document.getElementById('loginTime').value = result.scheduledTime;
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

  // Schedule login
  document.getElementById('scheduleLogin').addEventListener('click', function() {
    const loginTime = document.getElementById('loginTime').value;
    
    if (!loginTime) {
      showStatus('Please select a time to schedule login', 'error');
      return;
    }
    
    // Save the scheduled time
    chrome.storage.sync.set({
      scheduledTime: loginTime
    }, function() {
      // Calculate time until login
      const now = new Date();
      const scheduledDateTime = new Date();
      
      const [hours, minutes] = loginTime.split(':');
      scheduledDateTime.setHours(parseInt(hours));
      scheduledDateTime.setMinutes(parseInt(minutes));
      scheduledDateTime.setSeconds(0);
      
      // If the scheduled time is earlier today, schedule it for tomorrow
      if (scheduledDateTime < now) {
        scheduledDateTime.setDate(scheduledDateTime.getDate() + 1);
      }
      
      const timeUntilLogin = scheduledDateTime.getTime() - now.getTime();
      const minutesUntil = Math.round(timeUntilLogin / 60000);
      
      // Set an alarm for the scheduled time
      chrome.alarms.create('scheduledLogin', {
        when: scheduledDateTime.getTime()
      });
      
      showStatus(`Login scheduled for ${loginTime} (in about ${minutesUntil} minutes)`, 'success');
    });
  });

  // Login now
  document.getElementById('login').addEventListener('click', function() {
    performLogin();
  });

  function performLogin() {
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
  }

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